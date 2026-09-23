import type { MintDetails } from "@/services/mints";

/**
 * Tokenized equities pay dividends and apply splits by moving a display
 * multiplier on the mint (`ScaledUiAmountConfig`), never by minting. The next
 * multiplier and when it takes effect are on-chain before the ex-date, which
 * is what makes an upcoming corporate action readable ahead of time.
 */
export interface MultiplierState {
  /** The multiplier in force at `now`. */
  current: number;
  upcoming: {
    multiplier: number;
    effectiveAt: number;
    /** Relative change, e.g. 0.0035 for a 0.35% dividend, -0.5 for a 1:2 reverse split. */
    change: number;
  } | null;
}

export function multiplierState(mint: MintDetails, now: number): MultiplierState | null {
  const config = mint.scaledUiAmount;
  if (!config) return null;

  const pending = now < config.newMultiplierEffectiveTimestamp;
  const current = pending ? config.multiplier : config.newMultiplier;

  return {
    current,
    upcoming:
      pending && config.newMultiplier !== config.multiplier
        ? {
            multiplier: config.newMultiplier,
            effectiveAt: config.newMultiplierEffectiveTimestamp,
            change: config.newMultiplier / config.multiplier - 1,
          }
        : null,
  };
}

/**
 * A raw balance as the holder sees it: scaled by the multiplier in force.
 * Only for display — every transfer and allocation works in raw units.
 */
export function uiAmount(raw: bigint, mint: MintDetails, now: number): number {
  const base = Number(raw) / 10 ** mint.decimals;
  return base * (multiplierState(mint, now)?.current ?? 1);
}
