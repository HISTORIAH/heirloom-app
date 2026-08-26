import type { EstateData } from "@/contexts/VaultContext";
import type { TileTone } from "@/components/surface/tones";
import { computeEstateState } from "@/services/heirloom";

/**
 * Lifecycle presentation shared by the estate strip and the status tile. There
 * is no on-chain lifecycle enum, the state is derived from timestamps every
 * second, so both surfaces have to agree on the same derivation.
 */

export type UiState = "active" | "grace" | "claimable" | "distributed";

export type TFn = (key: string, opts?: Record<string, unknown>) => string;

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface TickResult {
  state: UiState;
  label: string;
  countdown: CountdownParts;
}

export const STATE_TONE: Record<UiState, TileTone> = {
  active: "paper",
  grace: "yellow-line",
  claimable: "red-line",
  distributed: "soft",
};

export const STATE_DOT: Record<UiState, string> = {
  active: "bg-accent-lime",
  grace: "bg-foreground",
  claimable: "bg-accent-red",
  distributed: "bg-muted-foreground/40",
};

/** Hairline colour that stays visible on whichever fill the state carries. */
export const STATE_LINE: Record<UiState, string> = {
  active: "border-tile-line",
  grace: "border-tile-line",
  claimable: "border-tile-line",
  distributed: "border-foreground/10",
};

export const statusMeta = (t: TFn): Record<UiState, { label: string; description: string }> => ({
  active: { label: t("dashboard.statusActive"), description: t("dashboard.statusActiveDesc") },
  grace: { label: t("dashboard.statusGrace"), description: t("dashboard.statusGraceDesc") },
  claimable: {
    label: t("dashboard.statusClaimable"),
    description: t("dashboard.statusClaimableDesc"),
  },
  distributed: {
    label: t("dashboard.statusDistributed"),
    description: t("dashboard.statusDistributedDesc"),
  },
});

const countdownLabels = (t: TFn): Record<UiState, string> => ({
  distributed: t("dashboard.labelDistributed"),
  claimable: t("dashboard.labelClaimable"),
  grace: t("dashboard.labelGrace"),
  active: t("dashboard.labelActive"),
});

export function isVaultEmpty(estate: EstateData): boolean {
  return estate.claimableAssets === 0 && estate.solBalance === 0 && estate.vaultTokens.length === 0;
}

export function computeTick(estate: EstateData, vaultEmpty: boolean, t: TFn): TickResult {
  const { state, secondsUntilGrace, secondsUntilClaimable } = computeEstateState({
    lastHeartbeat: estate.lastHeartbeat,
    heartbeatInterval: estate.heartbeatInterval,
    gracePeriod: estate.gracePeriod,
    pausedUntil: estate.pausedUntil,
    createdAt: estate.createdAt,
    vaultEmpty,
  });

  const remaining =
    state === "active" ? secondsUntilGrace :
    state === "grace" ? secondsUntilClaimable :
    0;

  return {
    state,
    label: countdownLabels(t)[state],
    countdown: {
      days: Math.floor(remaining / 86400),
      hours: Math.floor((remaining % 86400) / 3600),
      minutes: Math.floor((remaining % 3600) / 60),
      seconds: remaining % 60,
    },
  };
}

export function getEstateStripMeta(estate: EstateData, t: TFn) {
  const { state, countdown } = computeTick(estate, isVaultEmpty(estate), t);
  const timeLabel =
    state === "active" ? t("dashboard.timeLeft", { days: countdown.days }) :
    state === "grace" ? t("dashboard.graceDays", { days: countdown.days }) :
    state === "claimable" ? t("dashboard.claimable") :
    t("dashboard.distributed");
  return { state, dotColor: STATE_DOT[state], timeLabel, assetCount: 1 + estate.vaultTokens.length };
}
