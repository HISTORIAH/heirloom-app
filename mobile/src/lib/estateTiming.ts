export const HB_MIN_DAYS = 30;
export const HB_MAX_DAYS = 365;
export const GRACE_MIN_DAYS = 7;
export const GRACE_MAX_DAYS = 90;
export const PAUSE_MIN_DAYS = 1;
export const PAUSE_MAX_DAYS = 365;
export const HORIZON_DAYS = HB_MAX_DAYS + GRACE_MAX_DAYS;

export const HEARTBEAT_PRESETS = [30, 60, 90, 180, 365] as const;
export const GRACE_PRESETS = [7, 14, 30, 60, 90] as const;
export const PAUSE_PRESETS = [7, 14, 30, 60, 90] as const;

const MS_PER_DAY = 86_400_000;

function at(days: number): Date {
  return new Date(Date.now() + days * MS_PER_DAY);
}

export function dateLong(days: number): string {
  return at(days).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function dateShort(days: number): string {
  return at(days).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function horizonPct(days: number): number {
  return (days / HORIZON_DAYS) * 100;
}

export function daysRangeError(
  days: number,
  min: number,
  max: number,
  noun: string,
): string | undefined {
  if (!Number.isInteger(days) || days < min || days > max) {
    return `${noun} must be ${min} to ${max} days.`;
  }
  return undefined;
}
