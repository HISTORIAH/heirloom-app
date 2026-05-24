/**
 * Shared helpers for token/SOL amount inputs with percentage quick-fill.
 * Used by the Dashboard top-up and the Add Asset flow.
 */

/** Percentage quick-fill ladder shown under amount inputs. */
export const TOPUP_PCTS = [
  { pct: 25,  label: "25%", bg: "bg-accent-yellow" },
  { pct: 50,  label: "50%", bg: "bg-accent-cyan"   },
  { pct: 75,  label: "75%", bg: "bg-accent-orange" },
  { pct: 100, label: "Max", bg: "bg-accent-lime"   },
] as const;

/** Decimal step for an input field, capped at 6 places. */
export const amountStep = (decimals: number): number =>
  1 / Math.pow(10, Math.min(6, decimals));

/** A percentage of `max`, quantized down to the input `step`. */
export const pctOfMax = (max: number, pct: number, step: number): number =>
  Math.floor((max * pct) / 100 / step) * step;
