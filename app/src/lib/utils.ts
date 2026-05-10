import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Scales a UI amount (number or string) to a raw BigInt for transactions.
 * Avoids floating-point errors by using string manipulation.
 * @param uiAmount - The amount entered by the user (e.g., "1.50").
 * @param decimals - The number of decimals for the token.
 * @returns A BigInt representing the amount in base units.
 */
export function toRawTokenAmount(uiAmount: string | number, decimals: number): bigint {
  const [integer, fraction = ""] = uiAmount.toString().split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);

  return BigInt(integer + paddedFraction);
}

/**
 * Converts a raw BigInt balance (base units) to a UI-friendly number.
 * @param rawAmount - The raw integer balance from the blockchain (e.g., 1000000n).
 * @param decimals - The number of decimals for the token (e.g., 6 for USDC).
 * @returns The amount as a standard JavaScript number (e.g., 1.0).
 */
export function toUiAmount(rawAmount: bigint | number, decimals: number): number {
  return Number(rawAmount) / 10 ** decimals;
}

/**
 * Shortens a string (wallet, mint, or hash) by keeping the start and end.
 * @param address - The full string to truncate.
 * @param chars - Number of characters to keep on each end (default: 4).
 * @returns A formatted string like "0x12...abcd"
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2) return address;

  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

/**
 * Formats a UI amount into a localized string with smart decimal precision.
 * - Amounts >= 1000: No decimals.
 * - Amounts >= 1: 2 decimals.
 * - Amounts < 1: Up to 4 decimals.
 * @param uiAmount - The decimal number to format.
 * @returns A formatted string (e.g., "1,250", "15.50", or "0.0012").
 */
export function formatUiAmount(uiAmount: number): string {
  return uiAmount.toLocaleString(undefined, {
    maximumFractionDigits: uiAmount >= 1000 ? 0 : uiAmount >= 1 ? 2 : 4,
  });
}
