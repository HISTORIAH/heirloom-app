import { useCallback, useState } from "react";
import type { Signature } from "@solana/kit";
import { useWallet } from "@/contexts/WalletContext";
import { useVault } from "@/contexts/VaultContext";
import { errMsg } from "@/lib/utils";
import { TX_CONFIRM_POLL_MS, TX_CONFIRM_TIMEOUT_MS } from "@/lib/constants";
import type { TxFlowState } from "@/types/tx";

const IDLE: TxFlowState = { step: "idle", txId: null, error: null };

/**
 * Drives the modal's transaction view. `send` resolves once the wallet has signed and the
 * transaction is sent; this then waits for `confirmed` and refreshes the dashboard so the
 * change shows straight away.
 *
 * `deferRefresh` holds the refresh until `refresh()` is called — for changes that move the
 * estate to a new address, where refreshing would remount the card and drop the success view.
 */
export function useTxFlow() {
  const { rpc } = useWallet();
  const { fetchEstates } = useVault();
  const [state, setState] = useState<TxFlowState>(IDLE);

  const run = useCallback(
    async (send: () => Promise<string>, { deferRefresh = false } = {}): Promise<boolean> => {
      setState({ step: "approve", txId: null, error: null });
      try {
        const txId = await send();
        setState({ step: "confirming", txId, error: null });

        const deadline = Date.now() + TX_CONFIRM_TIMEOUT_MS;
        for (;;) {
          const { value } = await rpc.getSignatureStatuses([txId as Signature]).send();
          const status = value[0];
          if (status?.err) throw new Error("Transaction failed on-chain");
          if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") break;
          if (Date.now() > deadline) throw new Error("Timed out waiting for confirmation");
          await new Promise((r) => setTimeout(r, TX_CONFIRM_POLL_MS));
        }

        if (!deferRefresh) await fetchEstates();
        setState({ step: "done", txId, error: null });
        return true;
      } catch (err) {
        setState((s) => ({ step: "error", txId: s.txId, error: errMsg(err) }));
        return false;
      }
    },
    [rpc, fetchEstates],
  );

  const reset = useCallback(() => setState(IDLE), []);

  return {
    ...state,
    run,
    reset,
    refresh: fetchEstates,
    busy: state.step === "approve" || state.step === "confirming",
  };
}
