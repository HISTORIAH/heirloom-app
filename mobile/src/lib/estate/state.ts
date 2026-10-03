import type { EstateUiState } from "@/types/estate";

/** Where an estate is in its life right now, and how long until the next edge. */
export function computeEstateState(args: {
  lastCheckInTs: number;
  checkInIntervalSecs: number;
  gracePeriodSecs: number;
  delegatePauseExpiresAt: number;
  createdAt: number;
  vaultEmpty: boolean;
}): { state: EstateUiState; secondsUntilGrace: number; secondsUntilClaimable: number } {
  const { lastCheckInTs, checkInIntervalSecs, gracePeriodSecs, delegatePauseExpiresAt, createdAt, vaultEmpty } = args;

  if (vaultEmpty) return { state: "distributed", secondsUntilGrace: 0, secondsUntilClaimable: 0 };
  const anchor = lastCheckInTs > 0 ? lastCheckInTs : createdAt;
  const now = Math.floor(Date.now() / 1000);
  const graceDeadline = anchor + checkInIntervalSecs;
  const claimableAt = Math.max(graceDeadline + gracePeriodSecs, delegatePauseExpiresAt);

  if (now >= claimableAt) return { state: "claimable", secondsUntilGrace: 0, secondsUntilClaimable: 0 };
  if (now >= graceDeadline) return { state: "grace", secondsUntilGrace: 0, secondsUntilClaimable: claimableAt - now };
  return { state: "active", secondsUntilGrace: graceDeadline - now, secondsUntilClaimable: claimableAt - now };
}

export function isVaultEmpty(claimableAssets: number, claimableLamports: bigint): boolean {
  return claimableAssets === 0 && claimableLamports === 0n;
}

/** Seconds since epoch, as the chain counts it. */
export function nowSecs(): number {
  return Math.floor(Date.now() / 1000);
}
