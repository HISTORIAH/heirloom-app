import { SOLANA_RPC_ENDPOINT } from "@/config";
import { multiplierState } from "@/services/dividends";
import type { MintDetails } from "@/services/mints";

export function formatNumber(value: number, locale: string, maximumFractionDigits = 4): string {
  return value.toLocaleString(locale, { maximumFractionDigits });
}

/** A raw balance as the holder sees it, scaled by the mint's current multiplier. */
export function formatUiAmount(
  raw: bigint,
  mint: MintDetails,
  now: number,
  locale: string,
): string {
  const multiplier = multiplierState(mint, now)?.current ?? 1;
  return formatNumber((Number(raw) / 10 ** mint.decimals) * multiplier, locale);
}

/**
 * Parses an amount typed in display units back into raw units, undoing the
 * multiplier. Returns null for anything that is not a positive number.
 */
export function parseUiAmount(text: string, mint: MintDetails, now: number): bigint | null {
  const value = Number(text.trim());
  if (!Number.isFinite(value) || value <= 0) return null;
  const multiplier = multiplierState(mint, now)?.current ?? 1;
  const raw = BigInt(Math.floor((value / multiplier) * 10 ** mint.decimals));
  return raw > 0n ? raw : null;
}

/** US dollars: cents for anything from a dollar up, four significant digits below. */
export function formatUsd(value: number, locale: string): string {
  return value.toLocaleString(locale, {
    style: "currency",
    currency: "USD",
    ...(Math.abs(value) >= 1 || value === 0
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { maximumSignificantDigits: 4 }),
  });
}

/** A date and time, to the second for a plan timed in seconds. */
export function formatDate(seconds: number, locale: string, withSeconds = false): string {
  return new Date(seconds * 1000).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: withSeconds ? "medium" : "short",
  });
}

export function formatPercent(fraction: number, locale: string, signed = false): string {
  return fraction.toLocaleString(locale, {
    style: "percent",
    maximumFractionDigits: 2,
    signDisplay: signed ? "exceptZero" : "auto",
  });
}

export function truncateAddress(address: string, chars = 4): string {
  return address.length <= chars * 2
    ? address
    : `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export const SECONDS_PER_DAY = 86_400;

/** A span of time as a timer shows it: "00:00:27", with the days in front past one: "29d 23:59:41". */
export function formatCountdown(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / SECONDS_PER_DAY);
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = [
    Math.floor((total % SECONDS_PER_DAY) / 3600),
    Math.floor((total % 3600) / 60),
    total % 60,
  ]
    .map(pad)
    .join(":");
  return days > 0 ? `${days}d ${clock}` : clock;
}

/** A plan's interval, grace, or defer: in days, unless it isn't a whole number of them. */
export function formatDuration(
  seconds: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  return seconds % SECONDS_PER_DAY === 0
    ? t("common.days", { count: seconds / SECONDS_PER_DAY })
    : t("common.seconds", { count: seconds });
}

export function explorerTxUrl(signature: string): string {
  const base = `https://explorer.solana.com/tx/${signature}`;
  if (SOLANA_RPC_ENDPOINT.includes("mainnet")) return base;
  if (SOLANA_RPC_ENDPOINT.includes("devnet")) return `${base}?cluster=devnet`;
  return `${base}?cluster=custom&customUrl=${encodeURIComponent(SOLANA_RPC_ENDPOINT)}`;
}

/** A date without the time or year, for the ends of a timeline: "Sep 23". */
export function formatShortDate(seconds: number, locale: string): string {
  return new Date(seconds * 1000).toLocaleDateString(locale, { month: "short", day: "numeric" });
}
