import type { Estate } from "@historiah/heirloom";

import { estateSpan } from "@/lib/estateSpan";

export type ClaimView = {
  slab: string;
  eyebrow: string;
  value: string;
  unit: "SOL";
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

function solFigure(lamports: bigint): string {
  return (Number(lamports) / 1e9).toFixed(2);
}

export function presentClaim(data: Estate, claimableLamports: bigint): ClaimView {
  const span = estateSpan(data, claimableLamports);
  const shared = {
    slab: span.slab,
    value: solFigure(claimableLamports),
    unit: "SOL" as const,
    hold: "Hold to claim",
    showRuler: span.state !== "distributed",
    intervalDays: span.intervalDays,
    graceDays: span.graceDays,
    elapsedDays: span.elapsedDays,
    legendFrom: span.legendFrom,
    legendTo: span.legendTo,
  };

  if (span.state === "claimable") {
    return {
      ...shared,
      eyebrow: "Ready to claim",
      advice: "0.75% is taken from the vault.",
      canHold: true,
    };
  }
  if (span.state === "grace") {
    return {
      ...shared,
      eyebrow: "Claim opens after grace",
      canHold: false,
    };
  }
  if (span.state === "distributed") {
    return {
      ...shared,
      eyebrow: "Already claimed",
      canHold: false,
    };
  }
  return {
    ...shared,
    eyebrow: "Locked until the claim opens",
    canHold: false,
  };
}
