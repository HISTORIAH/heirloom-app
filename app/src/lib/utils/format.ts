import { SOL_DECIMALS, SECONDS_PER_MINUTE, SECONDS_PER_HOUR, SECONDS_PER_DAY } from "@/lib/constants";

/**
 * Compact duration: "30s", "5m", "2h", "30d". Long form pluralizes day(s).
 */
export function formatDuration(seconds: number, opts?: { long?: boolean }): string {
  if (seconds <= 0) return "0s";
  if (seconds < SECONDS_PER_MINUTE) return `${seconds}s`;
  if (seconds < SECONDS_PER_HOUR) return `${Math.floor(seconds / SECONDS_PER_MINUTE)}m`;
  if (seconds < SECONDS_PER_DAY) return `${Math.floor(seconds / SECONDS_PER_HOUR)}h`;
  const d = Math.round(seconds / SECONDS_PER_DAY);
  if (opts?.long) return `${d} day${d !== 1 ? "s" : ""}`;
  return `${d}d`;
}

export function errMsg(e: unknown, fallback = "Transaction rejected"): string {
  return e instanceof Error ? e.message : fallback;
}

export function formatSol(lamports: number, fractionDigits = 4): string {
  return (lamports / Math.pow(10, SOL_DECIMALS)).toFixed(fractionDigits);
}

export function formatTokenAmount(rawAmount: bigint | number, decimals: number): string {
  const ui = Number(rawAmount) / Math.pow(10, decimals);
  return ui.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(6, decimals),
  });
}

/**
 * Formats a UI amount into a localized string with smart decimal precision.
 * - Amounts >= 1000: No decimals.
 * - Amounts >= 1: 2 decimals.
 * - Amounts < 1: Up to 4 decimals.
 */
export function formatUiAmount(uiAmount: number): string {
  return uiAmount.toLocaleString(undefined, {
    maximumFractionDigits: uiAmount >= 1000 ? 0 : uiAmount >= 1 ? 2 : 4,
  });
}

/**
 * Shortens a string (wallet, mint, or hash) by keeping the start and end.
 * @param address - The full string to truncate.
 * @param chars - Number of characters to keep on each end (default: 4).
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2) return address;

  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}
