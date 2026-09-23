import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Instruction, TransactionSigner } from "@solana/kit";
import { useTranslation } from "@heirloom/i18n";
import { useWallet } from "@/contexts/WalletContext";
import { toast } from "@/hooks/use-toast";
import { explorerTxUrl } from "@/lib/format";
import { STOCKS_QUERY_KEY } from "@/hooks/useStocks";
import { isUserRejection, programErrorKey, sendAndConfirm } from "@/services/tx";

export type TxDoneKey =
  | "createBackup"
  | "createVault"
  | "cover"
  | "uncover"
  | "reapprove"
  | "removeRecord"
  | "checkIn"
  | "settings"
  | "closePlan"
  | "recover"
  | "claim"
  | "defer"
  | "vaultAdd"
  | "vaultDeposit"
  | "vaultWithdraw";

export interface TxRequest {
  /** Instructions grouped per transaction, each confirmed before the next is sent. */
  build: () => Promise<Instruction[][]>;
  done: TxDoneKey;
}

/**
 * Runs a transaction the way every action on these pages needs: through the
 * connected wallet, waiting for confirmation, reporting the outcome in the
 * user's words, and refreshing everything read from the chain.
 *
 * `pending` holds the id of the action in flight, so one button can show
 * progress while the others stay put.
 */
export function useStocksTx(signer: TransactionSigner) {
  const { t } = useTranslation("stocks");
  const { rpc } = useWallet();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);

  const run = useCallback(
    async (id: string, request: TxRequest): Promise<boolean> => {
      setPending(id);
      try {
        const batches = await request.build();
        const signatures = await sendAndConfirm({ rpc }, signer, batches);
        const last = signatures[signatures.length - 1];
        toast({
          title: t(`tx.done.${request.done}`),
          description: last ? (
            <a href={explorerTxUrl(last)} target="_blank" rel="noreferrer" className="underline">
              {t("tx.view")}
            </a>
          ) : undefined,
        });
        return true;
      } catch (error) {
        console.error(error);
        if (isUserRejection(error)) {
          toast({ title: t("tx.rejected") });
        } else {
          const key = programErrorKey(error);
          toast({
            variant: "destructive",
            title: t("tx.failed"),
            description: t(`errors.${key ?? "generic"}`),
          });
        }
        return false;
      } finally {
        setPending(null);
        // Everything read from the chain, but not the catalog, which a
        // transaction can't change.
        await queryClient.invalidateQueries({
          queryKey: [STOCKS_QUERY_KEY],
          predicate: (query) => query.queryKey[1] !== "catalog",
        });
      }
    },
    [queryClient, rpc, signer, t],
  );

  return { run, pending };
}
