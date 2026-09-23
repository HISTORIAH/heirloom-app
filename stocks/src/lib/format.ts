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

export function formatDate(seconds: number, locale: string): string {
  return new Date(seconds * 1000).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
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

export function explorerTxUrl(signature: string): string {
  const base = `https://explorer.solana.com/tx/${signature}`;
  if (SOLANA_RPC_ENDPOINT.includes("mainnet")) return base;
  if (SOLANA_RPC_ENDPOINT.includes("devnet")) return `${base}?cluster=devnet`;
  return `${base}?cluster=custom&customUrl=${encodeURIComponent(SOLANA_RPC_ENDPOINT)}`;
}
