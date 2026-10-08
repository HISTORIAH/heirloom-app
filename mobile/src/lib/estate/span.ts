import type { Estate } from "@historiah/heirloom";

import { SECONDS_PER_DAY } from "@/constants/time";
import { computeEstateState, isVaultEmpty, nowSecs } from "@/lib/estate/state";
import { colors } from "@/theme";
import type { EstateSpan, EstateUiState } from "@/types/estate";

function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function wholeDays(seconds: number): number {
  return Math.max(0, Math.floor(seconds / SECONDS_PER_DAY));
}

/** Fill for anything coloured by state: yellow, orange in grace, red when claimable. */
export function stateSlab(state: EstateUiState): string {
  if (state === "claimable") return colors.claim;
  if (state === "grace") return colors.orange;
  if (state === "distributed") return colors.paper;
  return colors.yellow;
}

export function estateSpan(data: Estate, claimableLamports: bigint): EstateSpan {
  const interval = Number(data.checkInIntervalSecs);
  const grace = Number(data.gracePeriodSecs);
  const lastCheckInTs = Number(data.lastCheckInTs);
  const createdAt = Number(data.createdAt);
  const delegatePauseExpiresAt = Number(data.delegatePauseExpiresAt);
  const { state, secondsUntilGrace, secondsUntilClaimable } = computeEstateState({
    lastCheckInTs,
    checkInIntervalSecs: interval,
    gracePeriodSecs: grace,
    delegatePauseExpiresAt,
    createdAt,
    vaultEmpty: isVaultEmpty(data.claimableAssets, claimableLamports),
  });

  const now = nowSecs();
  const anchor = lastCheckInTs > 0 ? lastCheckInTs : createdAt;
  const graceDeadline = anchor + interval;
  const claimableAt = Math.max(graceDeadline + grace, delegatePauseExpiresAt);
  const live = state === "active" || state === "grace";

  return {
    state,
    slab: stateSlab(state),
    intervalDays: Math.max(1, Math.round(interval / SECONDS_PER_DAY)),
    graceDays: Math.max(0, Math.round(grace / SECONDS_PER_DAY)),
    elapsedDays: wholeDays(now - anchor),
    legendFrom: `Checked in ${shortDate(anchor * 1000)}`,
    legendTo:
      state === "distributed"
        ? "Estate claimed"
        : state === "claimable"
          ? `Open since ${shortDate(claimableAt * 1000)}`
          : `Heir can claim ${shortDate(claimableAt * 1000)}`,
    daysUntilCheckIn: state === "active" ? wholeDays(graceDeadline - now) : 0,
    daysUntilClaim: live ? wholeDays(claimableAt - now) : 0,
    remainingSecs: state === "active" ? secondsUntilGrace : state === "grace" ? secondsUntilClaimable : 0,
    daysOpen: state === "claimable" ? wholeDays(now - claimableAt) : 0,
  };
}
