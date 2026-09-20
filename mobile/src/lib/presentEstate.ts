import type { Estate } from "@historiah/heirloom";

import type { EstateUiState } from "@/lib/estateState";
import { computeEstateState, isVaultEmpty } from "@/lib/estateState";
import { colors } from "@/theme";

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type EstateProgress = {
  ratio: number;
  caption: string;
  fill: string;
};

export type EstatePresentation = {
  state: EstateUiState;
  statusLabel: string;
  description: string;
  countdown: CountdownParts;
  checkInTone: "yellow" | "sage" | "ink";
  checkInLabel: string;
  stripMeta: string;
  progress: EstateProgress;
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

function clampRatio(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function assetCount(claimableAssets: number): number {
  return claimableAssets;
}

export function presentEstate(
  data: Estate,
  claimableLamports: bigint,
): EstatePresentation {
  const vaultEmpty = isVaultEmpty(data.claimableAssets, claimableLamports);
  const interval = Number(data.heartbeatInterval);
  const grace = Number(data.gracePeriod);
  const { state, secondsUntilGrace, secondsUntilClaimable } = computeEstateState({
    lastHeartbeat: Number(data.lastHeartbeat),
    heartbeatInterval: interval,
    gracePeriod: grace,
    pausedUntil: Number(data.pausedUntil),
    createdAt: Number(data.createdAt),
    vaultEmpty,
  });

  const assets = assetCount(data.claimableAssets);
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
      progress: {
        ratio: 0,
        caption: "Vault emptied",
        fill: colors.mute,
      },
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
      progress: {
        ratio: 1,
        caption: "Claim window open",
        fill: colors.claim,
      },
    };
  }
  if (state === "grace") {
    const countdown = partsFrom(secondsUntilClaimable);
    const ratio = grace > 0 ? clampRatio(secondsUntilClaimable / grace) : 0;
    return {
      state,
      statusLabel: "Grace",
      description: "Time until claimable",
      countdown,
      checkInTone: "sage",
      checkInLabel: "Check in",
      stripMeta: `${assetWord} · Grace · ${countdown.days}d`,
      progress: {
        ratio,
        caption: `${Math.round(ratio * 100)}% of grace left`,
        fill: colors.sage,
      },
    };
  }
  const countdown = partsFrom(secondsUntilGrace);
  const ratio = interval > 0 ? clampRatio(secondsUntilGrace / interval) : 0;
  return {
    state,
    statusLabel: "Active",
    description: "Next check-in due in",
    countdown,
    checkInTone: "yellow",
    checkInLabel: "Check in",
    stripMeta: `${assetWord} · ${countdown.days}d left`,
    progress: {
      ratio,
      caption: `${Math.round(ratio * 100)}% of heartbeat left`,
      fill: colors.yellow,
    },
  };
}

export function formatSol(lamports: bigint): string {
  const sol = Number(lamports) / 1e9;
  return sol.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export function padUnit(n: number): string {
  return pad2(n);
}
