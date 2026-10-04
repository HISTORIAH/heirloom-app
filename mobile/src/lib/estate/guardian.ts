import { SECONDS_PER_DAY } from "@/constants/time";
import { estateSpan } from "@/lib/estate/span";
import { nowSecs } from "@/lib/estate/state";
import { plural } from "@/lib/text";
import { colors } from "@/theme";
import type { GateKind, GuardianView } from "@/types/estate";
import type { EstateRow } from "@/types/program";

export function gateKind(row: EstateRow): GateKind {
  const { state } = estateSpan(row.data, row.claimableLamports);
  const now = nowSecs();
  const delegatePauseExpiresAt = Number(row.data.delegatePauseExpiresAt);
  const delegatePauseDurationSecs = Number(row.data.delegatePauseDurationSecs);
  if (state === "distributed") return "ended";
  if (delegatePauseExpiresAt > now) return "holding";
  if (state === "claimable") return "late";
  if (delegatePauseExpiresAt > 0) return "spent";
  if (delegatePauseDurationSecs <= 0) return "unset";
  return "holdable";
}

function pauseDaysOf(seconds: number): number {
  return Math.max(0, Math.round(seconds / SECONDS_PER_DAY));
}

export function presentGuardian(row: EstateRow): GuardianView {
  const kind = gateKind(row);
  const span = estateSpan(row.data, row.claimableLamports);
  const pauseDays = pauseDaysOf(Number(row.data.delegatePauseDurationSecs));
  const left = Math.max(0, Number(row.data.delegatePauseExpiresAt) - nowSecs());
  const daysLeft = kind === "holding" ? Math.floor(left / SECONDS_PER_DAY) : pauseDays;
  const elapsedPause = kind === "holding" ? Math.max(0, pauseDays - daysLeft) : 0;

  const shared = {
    value: String(daysLeft),
    unit: plural(daysLeft, "day", true),
    hold: "Hold to pause",
    canHold: kind === "holdable",
    pauseDays,
    elapsedPause,
    legendFrom: span.legendFrom,
    legendTo: pauseDays === 1 ? "1-day pause" : `${pauseDays}-day pause`,
  };

  if (kind === "holding") {
    return {
      ...shared,
      slab: colors.orange,
      eyebrow: "Pause days left",
    };
  }
  if (kind === "late") {
    return {
      ...shared,
      slab: colors.claim,
      eyebrow: "Too late to pause",
      advice: "The heir can already claim.",
      value: "0",
      unit: "days",
      pauseDays: 0,
    };
  }
  if (kind === "unset") {
    return {
      ...shared,
      slab: colors.paper,
      eyebrow: "No pause length",
      advice: "The owner has not set how long you can hold.",
      value: "0",
      unit: "days",
    };
  }
  if (kind === "spent" || kind === "ended") {
    return {
      ...shared,
      slab: colors.paper,
      eyebrow: kind === "ended" ? "This estate is empty" : "Pause already used",
      value: "0",
      unit: "days",
      pauseDays: 0,
    };
  }
  return {
    ...shared,
    slab: span.state === "grace" ? colors.orange : colors.yellow,
    eyebrow: "Pause days left",
  };
}
