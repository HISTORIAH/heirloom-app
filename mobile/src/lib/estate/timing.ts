import { MAX_INTERVAL_DAYS, MAX_TIMING_MINUTES, TIMING_EDIT_UNIT } from "@/constants/estate";
import { MS_PER_DAY, SECONDS_PER_DAY, SECONDS_PER_MINUTE } from "@/constants/time";

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

function parseWholeCount(
  text: string,
  label: string,
  allowZero: boolean,
  unit: "days" | "minutes",
): bigint {
  const trimmed = text.trim();
  const n = Number(trimmed);
  if (trimmed.length === 0 || !Number.isInteger(n) || n < 0) {
    throw new Error(`Enter ${label} in whole ${unit}`);
  }
  const singular = unit === "minutes" ? "minute" : "day";
  if (!allowZero && n < 1) throw new Error(`${label} must be at least 1 ${singular}`);
  const max = unit === "minutes" ? MAX_TIMING_MINUTES : MAX_INTERVAL_DAYS;
  if (n > max) throw new Error(`${label} cannot exceed ${max} ${unit}`);
  const secs = unit === "minutes" ? SECONDS_PER_MINUTE : SECONDS_PER_DAY;
  return BigInt(n) * BigInt(secs);
}

/** Whole days typed by the owner → seconds. Throws a sentence the form can show. */
export function parseDayCount(text: string, label: string, allowZero: boolean): bigint {
  return parseWholeCount(text, label, allowZero, "days");
}

export function parseMinuteCount(text: string, label: string, allowZero: boolean): bigint {
  return parseWholeCount(text, label, allowZero, "minutes");
}

/** On-chain seconds → the unit TIMING_EDIT_UNIT uses, as text for Update timing. */
export function displayTiming(seconds: bigint | number): string {
  const raw = Number(seconds);
  if (TIMING_EDIT_UNIT === "minutes") return String(Math.round(raw / SECONDS_PER_MINUTE));
  return daysFromSeconds(raw);
}

export function changedTimingField(
  text: string,
  onChain: bigint | number,
  label: string,
  allowZero: boolean,
): bigint | undefined {
  if (text === displayTiming(onChain)) return undefined;
  const next =
    TIMING_EDIT_UNIT === "minutes"
      ? parseMinuteCount(text, label, allowZero)
      : parseDayCount(text, label, allowZero);
  if (next === BigInt(onChain)) return undefined;
  return next;
}
