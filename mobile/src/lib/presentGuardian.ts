import { SECONDS_PER_DAY } from "@/lib/constants";
import { estateSpan } from "@/lib/estateSpan";
import type { EstateRow } from "@/lib/estates";
import { presentEstate } from "@/lib/presentEstate";
import { colors } from "@/theme";

export type GateKind = "holdable" | "unset" | "holding" | "spent" | "late" | "ended";

export function gateKind(row: EstateRow): GateKind {
  const { state } = presentEstate(row.data, row.claimableLamports);
  const now = Math.floor(Date.now() / 1000);
  const pausedUntil = Number(row.data.pausedUntil);
  const pauseDuration = Number(row.data.pauseDuration);
  if (state === "distributed") return "ended";
  if (pausedUntil > now) return "holding";
  if (state === "claimable") return "late";
  if (pausedUntil > 0) return "spent";
  if (pauseDuration <= 0) return "unset";
  return "holdable";
}

export type GuardianView = {
  slab: string;
  eyebrow: string;
  value: string;
  unit: string;
  advice?: string;
  hold: string;
  canHold: boolean;
  pauseDays: number;
  elapsedPause: number;
  legendFrom: string;
  legendTo: string;
};

function dayWord(n: number): string {
  return n === 1 ? "day" : "days";
}

function pauseDaysOf(seconds: number): number {
  return Math.max(0, Math.round(seconds / SECONDS_PER_DAY));
}

export function presentGuardian(row: EstateRow): GuardianView {
  const kind = gateKind(row);
  const span = estateSpan(row.data, row.claimableLamports);
  const pauseDays = pauseDaysOf(Number(row.data.pauseDuration));
  const now = Math.floor(Date.now() / 1000);
  const left = Math.max(0, Number(row.data.pausedUntil) - now);
  const daysLeft = kind === "holding" ? Math.floor(left / SECONDS_PER_DAY) : pauseDays;
  const elapsedPause = kind === "holding" ? Math.max(0, pauseDays - daysLeft) : 0;

  const shared = {
    value: String(daysLeft),
    unit: dayWord(daysLeft),
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
      slab: colors.sage,
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
      slab: colors.soft,
      eyebrow: "No pause length",
      advice: "The owner has not set how long you can hold.",
      value: "0",
      unit: "days",
    };
  }
  if (kind === "spent" || kind === "ended") {
    return {
      ...shared,
      slab: colors.soft,
      eyebrow: kind === "ended" ? "This vault is empty" : "Pause already used",
      value: "0",
      unit: "days",
      pauseDays: 0,
    };
  }
  return {
    ...shared,
    slab: span.state === "grace" ? colors.sage : colors.yellow,
    eyebrow: "Pause days left",
  };
}
