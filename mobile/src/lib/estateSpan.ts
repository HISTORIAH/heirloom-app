import type { Estate } from "@historiah/heirloom";

import { SECONDS_PER_DAY } from "@/lib/constants";
import { computeEstateState, isVaultEmpty, type EstateUiState } from "@/lib/estateState";
import { chipSwatch } from "@/lib/presentDashboard";

export type EstateSpan = {
  state: EstateUiState;
  slab: string;
  intervalDays: number;
  graceDays: number;
  elapsedDays: number;
  legendFrom: string;
  legendTo: string;
  daysUntilCheckIn: number;
  daysUntilClaim: number;
};

function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function estateSpan(data: Estate, claimableLamports: bigint): EstateSpan {
  const vaultEmpty = isVaultEmpty(data.claimableAssets, claimableLamports);
  const interval = Number(data.checkInIntervalSecs);
  const grace = Number(data.gracePeriodSecs);
  const lastCheckInTs = Number(data.lastCheckInTs);
  const createdAt = Number(data.createdAt);
  const delegatePauseExpiresAt = Number(data.delegatePauseExpiresAt);
  const { state } = computeEstateState({
    lastCheckInTs,
    checkInIntervalSecs: interval,
    gracePeriodSecs: grace,
    delegatePauseExpiresAt,
    createdAt,
    vaultEmpty,
  });

  const now = Math.floor(Date.now() / 1000);
  const anchor = lastCheckInTs > 0 ? lastCheckInTs : createdAt;
  const graceDeadline = anchor + interval;
  const claimableAt = Math.max(graceDeadline + grace, delegatePauseExpiresAt);
  const intervalDays = Math.max(1, Math.round(interval / SECONDS_PER_DAY));
  const graceDays = Math.max(0, Math.round(grace / SECONDS_PER_DAY));
  const elapsedDays = Math.max(0, Math.floor((now - anchor) / SECONDS_PER_DAY));
  const daysUntilCheckIn =
    state === "active" ? Math.max(0, Math.floor((graceDeadline - now) / SECONDS_PER_DAY)) : 0;
  const daysUntilClaim =
    state === "claimable" || state === "distributed"
      ? 0
      : Math.max(0, Math.floor((claimableAt - now) / SECONDS_PER_DAY));

  return {
    state,
    slab: chipSwatch(state),
    intervalDays,
    graceDays,
    elapsedDays,
    legendFrom: `Checked in ${shortDate(anchor * 1000)}`,
    legendTo:
      state === "distributed"
        ? "Vault emptied"
        : state === "claimable"
          ? `Open since ${shortDate(claimableAt * 1000)}`
          : `Heir can claim ${shortDate(claimableAt * 1000)}`,
    daysUntilCheckIn,
    daysUntilClaim,
  };
}
