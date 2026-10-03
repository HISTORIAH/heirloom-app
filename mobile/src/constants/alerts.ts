/** How long a signed Alerts session stays open on the phone. */
export const ALERTS_SESSION_MS = 15 * 60 * 1000;
/** Reminder lead times the owner can pick, and the ones picked by default. */
export const REMINDER_LEAD_DAYS = [7, 3, 1] as const;
export const DEFAULT_REMINDER_LEAD_DAYS: number[] = [7, 1];
