export const SOL_LABEL = "SOL";
export const SOL_DECIMALS = 9;

export const USDC_LABEL = "USDC";
export const USDC_DECIMALS = 6;

export const LABEL_MAX_LEN = 32;

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY = 86400;

export const USDC_DEVNET_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

/** Re-fetch reminders this often while a Telegram link is on screen; nothing is pushed on verify. */
export const REMINDER_POLL_MS = 3000;
/** Telegram usernames: 5–32 letters, digits or underscores. The leading @ is optional. */
export const TELEGRAM_USERNAME_PATTERN = /^@?[A-Za-z0-9_]{5,32}$/;

/** Simple email validation — the backend is the source of truth. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Heir profile limits, enforced by the backend. */
export const HEIR_NAME_MAX = 64;
export const HEIR_NOTE_MAX = 500;

/** Email verification codes: 8 characters, uppercase, no lookalikes (O/0, I/1). */
export const VERIFY_CODE_LENGTH = 8;
export const VERIFY_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
