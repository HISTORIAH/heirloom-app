/** Re-fetch reminders this often while a Telegram link is on screen; nothing is pushed when it's verified. */
export const REMINDER_POLL_MS = 3000;

/** Telegram usernames: 5–32 letters, digits or underscores. The leading @ is optional. */
export const TELEGRAM_USERNAME_PATTERN = /^@?[A-Za-z0-9_]{5,32}$/;

/** Channels the backend accepts but doesn't deliver yet. Shown disabled as "Soon". */
export const SOON_REMINDER_CHANNELS = [
  { channel: "email", label: "Email" },
  { channel: "sms", label: "SMS" },
] as const;

/** When the backend sends reminders. Fixed server-side; checking in starts a new cycle. */
export const REMINDER_SCHEDULE = [
  "7 days before a check-in is due",
  "On the day it's due",
  "Halfway through the grace period",
  "1 day before the grace period ends",
] as const;
export const HEIR_ALERT_TIMING = "1 hour after the grace period ends";
