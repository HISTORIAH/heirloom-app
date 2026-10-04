import type { Address, Signature } from "@solana/kit";

import { CONFIRM_POLL_MS, CONFIRM_POLL_TRIES } from "@/constants/solana";
import type { EstateRpc } from "@/types/program";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Wallet send is not our RPC. Poll until this client sees confirmed. */
export async function waitForConfirmed(rpc: EstateRpc, signature: string): Promise<void> {
  const sig = signature as Signature;
  for (let i = 0; i < CONFIRM_POLL_TRIES; i++) {
    const { value } = await rpc.getSignatureStatuses([sig], { searchTransactionHistory: true }).send();
    const st = value[0];
    if (st?.err !== null && st?.err !== undefined) throw new Error("Transaction failed on chain");
    if (st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized") return;
    await delay(CONFIRM_POLL_MS);
  }
}

/** Close/reassign wipe the PDA. Signature status can miss our RPC; the account cannot. */
export async function waitUntilAccountGone(rpc: EstateRpc, account: Address): Promise<void> {
  for (let i = 0; i < CONFIRM_POLL_TRIES; i++) {
    const { value } = await rpc.getAccountInfo(account, { encoding: "base64", commitment: "confirmed" }).send();
    if (value === null || value === undefined || BigInt(value.lamports) === 0n) return;
    await delay(CONFIRM_POLL_MS);
  }
}
