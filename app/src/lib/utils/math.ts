/**
 * Scales a UI amount (number or string) to a raw BigInt for transactions.
 * Avoids floating-point errors by using string manipulation.
 */
export function toRawTokenAmount(uiAmount: string | number, decimals: number): bigint {
  const [integer, fraction = ""] = uiAmount.toString().split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(integer + paddedFraction);
}

/**
 * Converts a raw BigInt balance (base units) to a UI-friendly number.
 */
export function toUiAmount(rawAmount: bigint | number, decimals: number): number {
  return Number(rawAmount) / 10 ** decimals;
}

/** Decimal step for an input field, capped at 6 places. */
export const amountStep = (decimals: number): number =>
  1 / Math.pow(10, Math.min(6, decimals));

/** A percentage of `max`, quantized down to the input `step`. */
export const pctOfMax = (max: number, pct: number, step: number): number =>
  Math.floor((max * pct) / 100 / step) * step;
