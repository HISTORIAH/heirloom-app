import { MAX_INTERVAL_DAYS } from "@/constants/estate";
import { MS_PER_DAY, SECONDS_PER_DAY } from "@/constants/time";

function inDays(days: number): Date {
  return new Date(Date.now() + days * MS_PER_DAY);
}

/** "31 December 2026", `days` from now. */
export function dateLong(days: number): string {
  return inDays(days).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** "31 Dec 2026", `days` from now. */
export function dateShort(days: number): string {
  return inDays(days).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function daysRangeError(days: number, min: number, max: number, noun: string): string | undefined {
  if (!Number.isInteger(days) || days < min || days > max) return `${noun} must be ${min} to ${max} days.`;
  return undefined;
}

export function daysToSecs(days: number): bigint {
  return BigInt(days * SECONDS_PER_DAY);
}

/** On-chain seconds → whole days, as text for a form field. */
export function daysFromSeconds(seconds: bigint | number): string {
  return String(Math.round(Number(seconds) / SECONDS_PER_DAY));
}

/** Whole days typed by the owner → seconds. Throws a sentence the form can show. */
export function parseDayCount(text: string, label: string, allowZero: boolean): bigint {
  const trimmed = text.trim();
  const n = Number(trimmed);
  if (trimmed.length === 0 || !Number.isInteger(n) || n < 0) throw new Error(`Enter ${label} in whole days`);
  if (!allowZero && n < 1) throw new Error(`${label} must be at least 1 day`);
  if (n > MAX_INTERVAL_DAYS) throw new Error(`${label} cannot exceed ${MAX_INTERVAL_DAYS} days`);
  return daysToSecs(n);
}
