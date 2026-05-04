import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertToRawTokenAmount(uiAmount: number, decimals: number): bigint {
  return BigInt(Math.round(uiAmount * Math.pow(10, decimals)));
}

export function convertToUiAmount(rawAmount: bigint, decimals: number): number {
  return Number(rawAmount) / Math.pow(10, decimals);
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
