import type { TimelineStop } from "@/types/reminders";

/** Re-fetch reminders this often while a verification is on screen; nothing is pushed when it's verified. */
export const REMINDER_POLL_MS = 3000;

/** Telegram usernames: 5–32 letters, digits or underscores. The leading @ is optional. */
export const TELEGRAM_USERNAME_PATTERN = /^@?[A-Za-z0-9_]{5,32}$/;

/** A rough shape check. The backend has the final say. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email codes: 8 characters, uppercase, with no lookalikes (O/0, I/1). */
export const VERIFY_CODE_LENGTH = 8;
export const VERIFY_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

/** Heir profile limits, enforced by the backend. */
export const HEIR_NAME_MAX = 64;
export const HEIR_NOTE_MAX = 500;

/** Channels a contact can be added on, in chip order. */
export const REMINDER_CHANNELS = [
  { channel: "telegram", label: "Telegram" },
  { channel: "email", label: "Email" },
] as const;

/** Channels the backend accepts but doesn't deliver yet. Shown disabled as "Soon". */
export const SOON_REMINDER_CHANNELS = [{ channel: "sms", label: "SMS" }] as const;

/** When the backend sends reminders. Fixed server-side; checking in starts a new cycle. */
export const REMINDER_SCHEDULE = [
  "7 days before a check-in is due",
  "On the day it's due",
  "Halfway through the grace period",
  "1 day before the grace period ends",
] as const;
export const HEIR_ALERT_TIMING = "1 hour after the grace period ends";

/** REMINDER_SCHEDULE plus the heir alert, drawn as the five-stop timeline. */
export const REMINDER_TIMELINE: readonly TimelineStop[] = [
  { title: "7 days", sub: "before due", phase: "check-in" },
  { title: "Due", sub: "day", phase: "check-in" },
  { title: "Mid", sub: "grace", phase: "grace" },
  { title: "1 day", sub: "left", phase: "grace" },
  { title: "Heir", sub: "told", phase: "heir" },
];

/** A check-in this close lists the estate under "Needs attention". Matches the first reminder. */
export const ATTENTION_DUE_DAYS = 7;
