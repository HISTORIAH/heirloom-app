import type { Address, Signature } from "@solana/kit";

import { CONFIRM_POLL_MS, CONFIRM_POLL_TRIES } from "@/constants/solana";
import { isNetworkError } from "@/lib/failure";
import type { EstateRpc } from "@/types/program";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * One poll. A network blip (Android often fails a DNS lookup right after the wallet app hands
 * back) yields `undefined` so the loop polls again; only the last try lets it through.
 */
async function poll<T>(request: () => Promise<T>, attempt: number): Promise<T | undefined> {
  try {
    return await request();
  } catch (cause) {
    if (!isNetworkError(cause) || attempt === CONFIRM_POLL_TRIES - 1) throw cause;
    return undefined;
  }
}

/** Wallet send is not our RPC. Poll until this client sees confirmed. */
export async function waitForConfirmed(rpc: EstateRpc, signature: string): Promise<void> {
  const sig = signature as Signature;
  for (let i = 0; i < CONFIRM_POLL_TRIES; i++) {
    const statuses = await poll(
      () => rpc.getSignatureStatuses([sig], { searchTransactionHistory: true }).send(),
      i,
    );
    const st = statuses?.value[0];
    if (st?.err !== null && st?.err !== undefined) throw new Error("Transaction failed on chain");
    if (st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized") return;
    await delay(CONFIRM_POLL_MS);
  }
}

/** Close/reassign wipe the PDA. Signature status can miss our RPC; the account cannot. */
export async function waitUntilAccountGone(rpc: EstateRpc, account: Address): Promise<void> {
  for (let i = 0; i < CONFIRM_POLL_TRIES; i++) {
    const info = await poll(
      () => rpc.getAccountInfo(account, { encoding: "base64", commitment: "confirmed" }).send(),
      i,
    );
    if (info !== undefined) {
      const { value } = info;
      if (value === null || value === undefined || BigInt(value.lamports) === 0n) return;
    }
    await delay(CONFIRM_POLL_MS);
  }
}
