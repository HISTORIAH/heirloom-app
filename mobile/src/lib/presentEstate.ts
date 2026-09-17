import type { Estate } from "@historiah/heirloom";

import type { EstateUiState } from "@/lib/estateState";
import { computeEstateState, isVaultEmpty } from "@/lib/estateState";

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type EstatePresentation = {
  state: EstateUiState;
  statusLabel: string;
  description: string;
  countdown: CountdownParts;
  checkInTone: "yellow" | "sage" | "ink";
  checkInLabel: string;
  stripMeta: string;
};

function partsFrom(seconds: number): CountdownParts {
  const s = Math.max(0, seconds);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function assetCount(claimableAssets: number, claimableLamports: bigint): number {
  return (claimableLamports > 0n ? 1 : 0) + claimableAssets;
}

export function presentEstate(
  data: Estate,
  claimableLamports: bigint,
): EstatePresentation {
  const vaultEmpty = isVaultEmpty(data.claimableAssets, claimableLamports);
  const { state, secondsUntilGrace, secondsUntilClaimable } = computeEstateState({
    lastHeartbeat: Number(data.lastHeartbeat),
    heartbeatInterval: Number(data.heartbeatInterval),
    gracePeriod: Number(data.gracePeriod),
    pausedUntil: Number(data.pausedUntil),
    createdAt: Number(data.createdAt),
    vaultEmpty,
  });

  const assets = assetCount(data.claimableAssets, claimableLamports);
  const assetWord = assets === 1 ? "1 asset" : `${assets} assets`;

  if (state === "distributed") {
    return {
      state,
      statusLabel: "Distributed",
      description: "This vault has been claimed.",
      countdown: partsFrom(0),
      checkInTone: "ink",
      checkInLabel: "Distributed",
      stripMeta: `${assetWord} · Distributed`,
    };
  }
  if (state === "claimable") {
    return {
      state,
      statusLabel: "Claimable",
      description: "Heir can claim. Check in to reclaim.",
      countdown: partsFrom(0),
      checkInTone: "ink",
      checkInLabel: "I'm alive — reclaim",
      stripMeta: `${assetWord} · Claimable`,
    };
  }
  if (state === "grace") {
    const countdown = partsFrom(secondsUntilClaimable);
    return {
      state,
      statusLabel: "Grace",
      description: "Time until claimable",
      countdown,
      checkInTone: "sage",
      checkInLabel: "Check in",
      stripMeta: `${assetWord} · Grace · ${countdown.days}d`,
    };
  }
  const countdown = partsFrom(secondsUntilGrace);
  return {
    state,
    statusLabel: "Active",
    description: "Next check-in due in",
    countdown,
    checkInTone: "yellow",
    checkInLabel: "Check in",
    stripMeta: `${assetWord} · ${countdown.days}d left`,
  };
}

export function formatSol(lamports: bigint): string {
  const sol = Number(lamports) / 1e9;
  return sol.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

export function padUnit(n: number): string {
  return pad2(n);
}
