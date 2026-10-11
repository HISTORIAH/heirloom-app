import { DEMO_TIMING } from "@/config";
import { DEMO_CHOICE_SECS, MAX_INTERVAL_DAYS, MAX_TIMING_MINUTES, TIMING_EDIT_UNIT } from "@/constants/estate";
import { MS_PER_DAY, SECONDS_PER_DAY, SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from "@/constants/time";
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

const DURATION_UNITS = [
  { secs: SECONDS_PER_DAY, noun: "day" },
  { secs: SECONDS_PER_HOUR, noun: "hour" },
  { secs: SECONDS_PER_MINUTE, noun: "minute" },
] as const;

/** `secs` split into whole days, hours and minutes, dropping the zeros. Rounds to the minute. */
function durationParts(secs: number): { count: number; noun: string }[] {
  let left = Math.max(0, Math.round(secs / SECONDS_PER_MINUTE)) * SECONDS_PER_MINUTE;
  const parts: { count: number; noun: string }[] = [];
  for (const unit of DURATION_UNITS) {
    const count = Math.floor(left / unit.secs);
    left -= count * unit.secs;
    if (count > 0) parts.push({ count, noun: unit.noun });
  }
  return parts.length > 0 ? parts : [{ count: 0, noun: "minute" }];
}

/** "30 days", "12 hours", "45 minutes"; mixed only when it has to be: "1 day 6 hours". */
export function durationText(secs: number): string {
  return durationParts(secs)
    .map(({ count, noun }) => `${count} ${noun}${count === 1 ? "" : "s"}`)
    .join(" ");
}

/** "30-day", "12-hour", as in "a 30-day wait". Mixed durations fall back to `durationText`. */
export function durationAdjective(secs: number): string {
  const parts = durationParts(secs);
  if (parts.length > 1) return durationText(secs);
  return `${parts[0].count}-${parts[0].noun}`;
}

/** "Every 30 days · 7-day grace": the cadence line on estate rows and cards. */
export function cadenceLine(intervalSecs: bigint | number, graceSecs: bigint | number): string {
  const grace = Number(graceSecs);
  const graceLabel =
    durationParts(grace).length > 1 ? `${durationText(grace)} of grace` : `${durationAdjective(grace)} grace`;
  return `Every ${durationText(Number(intervalSecs))} · ${graceLabel}`;
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
