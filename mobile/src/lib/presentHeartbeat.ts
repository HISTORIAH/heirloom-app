import type { Estate } from "@historiah/heirloom";

import { estateSpan } from "@/lib/estateSpan";

export type HeartbeatView = {
  slab: string;
  eyebrow: string;
  value: string;
  unit: string;
  advice?: string;
  hold: string;
  canHold: boolean;
  showRuler: boolean;
  intervalDays: number;
  graceDays: number;
  elapsedDays: number;
  legendFrom: string;
  legendTo: string;
};

function dayWord(n: number): string {
  return n === 1 ? "day" : "days";
}

export function presentHeartbeat(data: Estate, claimableLamports: bigint): HeartbeatView {
  const span = estateSpan(data, claimableLamports);
  const shared = {
    slab: span.slab,
    showRuler: span.state !== "distributed",
    intervalDays: span.intervalDays,
    graceDays: span.graceDays,
    elapsedDays: span.elapsedDays,
    legendFrom: span.legendFrom,
    legendTo: span.legendTo,
    hold: "Hold to check in",
    canHold: span.state !== "distributed",
  };

  if (span.state === "grace") {
    return {
      ...shared,
      eyebrow: "Check-in missed. Your heir can claim in",
      value: String(span.daysUntilClaim),
      unit: dayWord(span.daysUntilClaim),
    };
  }
  if (span.state === "claimable") {
    return {
      ...shared,
      eyebrow: "Your heir can claim this vault",
      value: "0",
      unit: "days",
      hold: "Hold to check in and close it",
    };
  }
  if (span.state === "distributed") {
    return {
      ...shared,
      eyebrow: "This vault has been claimed",
      value: "0",
      unit: "days",
    };
  }
  return {
    ...shared,
    eyebrow: "Next check-in due in",
    value: String(span.daysUntilCheckIn),
    unit: dayWord(span.daysUntilCheckIn),
  };
}
