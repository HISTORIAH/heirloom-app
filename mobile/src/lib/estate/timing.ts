import { DEMO_TIMING } from "@/config";
import { DEMO_CHOICE_SECS, MAX_INTERVAL_DAYS, MAX_TIMING_MINUTES, TIMING_EDIT_UNIT } from "@/constants/estate";
import { MS_PER_DAY, SECONDS_PER_DAY, SECONDS_PER_MINUTE } from "@/constants/time";
import type { TimingChoice } from "@/types/estate";

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

/** The create wizard's chips for `days`, plus the 1-minute demo choice in demo timing. */
export function timingChoices(days: readonly number[]): TimingChoice[] {
  const choices = days.map((count) => ({ secs: count * SECONDS_PER_DAY, label: `${count}d` }));
  if (!DEMO_TIMING) return choices;
  return [...choices, { secs: DEMO_CHOICE_SECS, label: `${DEMO_CHOICE_SECS / SECONDS_PER_MINUTE}m` }];
}

function isWholeDays(secs: number): boolean {
  return secs % SECONDS_PER_DAY === 0;
}

/** "90 days", "1 minute". Whole days read as days, anything shorter as minutes. */
export function durationText(secs: number): string {
  const [count, noun] = isWholeDays(secs)
    ? [secs / SECONDS_PER_DAY, "day"]
    : [Math.round(secs / SECONDS_PER_MINUTE), "minute"];
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** "30-day", "1-minute", as in "a 30-day wait". */
export function durationAdjective(secs: number): string {
  return durationText(secs).replace(/s$/, "").replace(" ", "-");
}

/** "90d", "1m": a fact row's short form. */
export function durationShort(secs: number): string {
  return isWholeDays(secs) ? `${secs / SECONDS_PER_DAY}d` : `${Math.round(secs / SECONDS_PER_MINUTE)}m`;
}

/** "31 Dec 2026", or "14:32" when `secs` from now is under a day. */
export function dueShort(secs: number): string {
  if (secs >= SECONDS_PER_DAY) return dateShort(secs / SECONDS_PER_DAY);
  return new Date(Date.now() + secs * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** "31 December 2026", or "14:32" when `secs` from now is under a day. */
export function dueLong(secs: number): string {
  return secs >= SECONDS_PER_DAY ? dateLong(secs / SECONDS_PER_DAY) : dueShort(secs);
}

/** A chip value outside the day bounds is only fine when it's the demo choice in demo timing. */
export function durationRangeError(secs: number, minDays: number, maxDays: number, noun: string): string | undefined {
  if (DEMO_TIMING && secs === DEMO_CHOICE_SECS) return undefined;
  const days = secs / SECONDS_PER_DAY;
  if (!Number.isInteger(days) || days < minDays || days > maxDays) {
    return `${noun} must be ${minDays} to ${maxDays} days.`;
  }
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
