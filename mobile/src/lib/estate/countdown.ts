import { SECONDS_PER_DAY, SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from "@/constants/time";
import type { Countdown, CountdownUnit, EstateUiState } from "@/types/estate";

/** Days, then hours, then minutes, then seconds. One unit at a time. */
export function countdownFromSeconds(seconds: number): Countdown {
  const s = Math.max(0, Math.floor(seconds));
  if (s >= SECONDS_PER_DAY) return { value: Math.floor(s / SECONDS_PER_DAY), unit: "days" };
  if (s >= SECONDS_PER_HOUR) return { value: Math.floor(s / SECONDS_PER_HOUR), unit: "hours" };
  if (s >= SECONDS_PER_MINUTE) return { value: Math.floor(s / SECONDS_PER_MINUTE), unit: "minutes" };
  return { value: s, unit: "seconds" };
}

export function countdownNoun(unit: CountdownUnit, value: number): string {
  if (unit === "days") return value === 1 ? "day" : "days";
  if (unit === "hours") return value === 1 ? "hour" : "hours";
  if (unit === "minutes") return value === 1 ? "minute" : "minutes";
  return value === 1 ? "second" : "seconds";
}

export function ownerCountdownCaption(state: EstateUiState, countdown: Countdown): string {
  const word = countdownNoun(countdown.unit, countdown.value);
  if (state === "grace") return `${word} until your\nheir can claim`;
  if (state === "claimable") return `${word} your heir\ncould claim`;
  return `${word} to check in`;
}

export function signerCountdownCaption(state: EstateUiState, countdown: Countdown): string {
  const word = countdownNoun(countdown.unit, countdown.value);
  if (state === "grace") return `${word} until their\nheir can claim`;
  return `${word} left`;
}
