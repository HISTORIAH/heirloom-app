import type { Estate } from "@historiah/heirloom";

import { SECONDS_PER_DAY } from "@/lib/constants";
import {
  computeEstateState,
  isVaultEmpty,
  type EstateUiState,
} from "@/lib/estateState";
import { colors } from "@/theme";

export type DashboardView = {
  state: EstateUiState;
  slab: string;
  eyebrow: string;
  advice?: string;
  days: number;
  unit: string;
  hold: string;
  intervalDays: number;
  graceDays: number;
  elapsedDays: number;
  totalDays: number;
  legendFrom: string;
  legendTo: string;
};

function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dayWord(n: number): string {
  return n === 1 ? "day" : "days";
}

export function chipSwatch(state: EstateUiState): string {
  if (state === "claimable") return colors.claim;
  if (state === "grace") return colors.sage;
  if (state === "distributed") return colors.soft;
  return colors.yellow;
}

export function presentDashboard(
  data: Estate,
  claimableLamports: bigint,
): DashboardView {
  const vaultEmpty = isVaultEmpty(data.claimableAssets, claimableLamports);
  const interval = Number(data.heartbeatInterval);
  const grace = Number(data.gracePeriod);
  const lastHeartbeat = Number(data.lastHeartbeat);
  const createdAt = Number(data.createdAt);
  const pausedUntil = Number(data.pausedUntil);
  const { state } = computeEstateState({
    lastHeartbeat,
    heartbeatInterval: interval,
    gracePeriod: grace,
    pausedUntil,
    createdAt,
    vaultEmpty,
  });

  const now = Math.floor(Date.now() / 1000);
  const anchor = lastHeartbeat > 0 ? lastHeartbeat : createdAt;
  const graceDeadline = anchor + interval;
  const claimableAt = Math.max(graceDeadline + grace, pausedUntil);
  const intervalDays = Math.max(1, Math.round(interval / SECONDS_PER_DAY));
  const graceDays = Math.max(0, Math.round(grace / SECONDS_PER_DAY));
  const totalDays = Math.max(1, intervalDays + graceDays);
  const elapsedDays = Math.max(0, Math.floor((now - anchor) / SECONDS_PER_DAY));
  const checkedInMs = anchor * 1000;
  const claimOpensMs = claimableAt * 1000;
  const legendFrom = `Checked in ${shortDate(checkedInMs)}`;

  if (state === "distributed") {
    return {
      state,
      slab: colors.soft,
      eyebrow: "This vault has been claimed",
      days: 0,
      unit: "days",
      hold: "Hold to check in",
      intervalDays,
      graceDays,
      elapsedDays: 0,
      totalDays,
      legendFrom,
      legendTo: "Vault emptied",
    };
  }

  if (state === "claimable") {
    const shown = Math.max(0, now - claimableAt);
    const days = Math.floor(shown / SECONDS_PER_DAY);
    return {
      state,
      slab: colors.claim,
      eyebrow: "Your heir can claim this vault",
      days,
      unit: days === 1 ? "day open" : "days open",
      hold: "Hold to check in and close it",
      intervalDays,
      graceDays,
      elapsedDays,
      totalDays,
      legendFrom,
      legendTo: `Open since ${shortDate(claimOpensMs)}`,
    };
  }

  if (state === "grace") {
    const shown = Math.max(0, claimableAt - now);
    const days = Math.floor(shown / SECONDS_PER_DAY);
    return {
      state,
      slab: colors.sage,
      eyebrow: "Check-in missed. Your heir can claim in",
      days,
      unit: dayWord(days),
      hold: "Hold to check in",
      intervalDays,
      graceDays,
      elapsedDays,
      totalDays,
      legendFrom,
      legendTo: `Heir can claim ${shortDate(claimOpensMs)}`,
    };
  }

  const shown = Math.max(0, graceDeadline - now);
  const days = Math.floor(shown / SECONDS_PER_DAY);
  return {
    state,
    slab: colors.yellow,
    eyebrow: "Next check-in due in",
    days,
    unit: dayWord(days),
    hold: "Hold to check in",
    intervalDays,
    graceDays,
    elapsedDays,
    totalDays,
    legendFrom,
    legendTo: `Heir can claim ${shortDate(claimOpensMs)}`,
  };
}
