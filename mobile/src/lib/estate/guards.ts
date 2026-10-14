import { fetchMaybeEstate, findEstatePda } from "@historiah/heirloom";
import type { Address } from "@solana/kit";

import type { EstateRpc } from "@/types/program";

/** Preconditions checked before building a transaction, so the owner gets a sentence instead of a program error. */

export function isPausedNow(delegatePauseExpiresAt: bigint | number): boolean {
  const until = Number(delegatePauseExpiresAt);
  return until > 0 && until > Date.now() / 1000;
}

export function assertNotPaused(delegatePauseExpiresAt: bigint | number): void {
  if (isPausedNow(delegatePauseExpiresAt)) throw new Error("This estate is paused. Wait until the pause ends.");
}

export async function estateExists(rpc: EstateRpc, estatePda: Address): Promise<boolean> {
  const maybe = await fetchMaybeEstate(rpc, estatePda);
  return maybe.exists && maybe.lamports > 0n;
}

export async function assertEstateFree(rpc: EstateRpc, authority: Address, heir: Address): Promise<void> {
  const [estatePda] = await findEstatePda({ authority, heir });
  if (await estateExists(rpc, estatePda)) {
    throw new Error("An estate already exists for this heir. Close it or pick a different heir.");
  }
}
