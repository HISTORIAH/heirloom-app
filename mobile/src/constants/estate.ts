/** Longest estate name the backend stores. */
export const LABEL_MAX_LEN = 32;

/** On-chain bounds for check-in and grace, in days. */
export const CHECK_IN_MIN_DAYS = 30;
export const CHECK_IN_MAX_DAYS = 365;
export const GRACE_MIN_DAYS = 7;
export const GRACE_MAX_DAYS = 90;
/** Upper bound for any day field edited on an existing estate. */
export const MAX_INTERVAL_DAYS = 365;

export const DEFAULT_CHECK_IN_DAYS = 90;
export const DEFAULT_GRACE_DAYS = 30;
export const DEFAULT_PAUSE_DAYS = 7;

/** The four check-in and heir-wait choices the create flow offers. */
export const CHECK_IN_CHOICES = [30, 90, 180, 365] as const;
export const WAIT_CHOICES = [7, 14, 30, 90] as const;

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
