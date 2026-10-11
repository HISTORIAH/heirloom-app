import { DEMO_TIMING } from "@/config";
import type { TimingUnit } from "@/types/estate";

/** Longest estate name the backend stores. */
export const LABEL_MAX_LEN = 32;

/** Bounds the app offers for check-in and grace, in days. On-chain only caps at 365 days. */
export const CHECK_IN_MIN_DAYS = 30;
export const CHECK_IN_MAX_DAYS = 365;
export const GRACE_MIN_DAYS = 7;
export const GRACE_MAX_DAYS = 90;
/** Upper bound for any day field edited on an existing estate. */
export const MAX_INTERVAL_DAYS = 365;
/** Cap when TIMING_EDIT_UNIT is minutes. Same wall-clock as MAX_INTERVAL_DAYS. */
export const MAX_TIMING_MINUTES = MAX_INTERVAL_DAYS * 24 * 60;

export const DEFAULT_CHECK_IN_DAYS = 90;
export const DEFAULT_GRACE_DAYS = 30;
export const DEFAULT_PAUSE_DAYS = 7;

/** The check-in and heir-wait choices the create flow offers, in days. */
export const CHECK_IN_CHOICES = [30, 90, 180, 365] as const;
export const WAIT_CHOICES = [7, 14, 30, 90] as const;

/**
 * Demo timing adds one 1-minute choice to check-in and to wait, so an estate can be claimed two
 * minutes after it's created.
 */
export const DEMO_CHOICE_SECS = 60;

/** Update timing edits in minutes in demo timing, days otherwise. */
export const TIMING_EDIT_UNIT: TimingUnit = DEMO_TIMING ? "minutes" : "days";

/** A check-in this close turns its list tag yellow. */
export const DUE_SOON_DAYS = 14;

/** Estate detail lists this many holdings (SOL first, then by value) before "Show all". */
export const HOLDINGS_PREVIEW = 4;
/** Wallet holdings worth less than this (USD) sit under "Hide dust" in the top-up picker. */
export const DUST_USD = 1;
/** Quick-fill chips on the top-up amount step, as percent of what the wallet holds. MAX is separate. */
export const TOP_UP_QUICK_PERCENTS = [25, 50] as const;
/** Quick picks round down to this many places; MAX on a token stays exact so the whole balance moves. */
export const TOP_UP_QUICK_PLACES = 4;
