export const SOL_LABEL = "SOL";
export const SOL_DECIMALS = 9;
/** SOL's mint for price lookups. Deposits use native SOL; this is only an id. */
export const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";
/** SOL that Max leaves in the wallet so the deposit can still pay its fee. */
export const SOL_MAX_RESERVE = 0.01;

export const USDC_LABEL = "USDC";
export const USDC_DECIMALS = 6;

export const LABEL_MAX_LEN = 32;

/** localStorage key for the last connected wallet account, so it reconnects on the next visit. */
export const SELECTED_WALLET_STORAGE_KEY = "heirloom:selected-wallet-account";

/** Base fee for one signature, in lamports. Priority fees aren't added by the app. */
export const NETWORK_FEE_LAMPORTS = 5000;
/** Bytes a new token registration rents: the vault's token account and the asset record PDA. */
export const TOKEN_ACCOUNT_SPACE = 165;
export const ASSET_RECORD_SPACE = 21;

/** The program's ceiling for the check-in interval and grace period (365 days). */
export const MAX_INTERVAL_SECS = 31_536_000;

/** Schedule presets offered as chips, in days. Anything else goes through Custom. */
export const INTERVAL_PRESET_DAYS = [7, 30, 90];
export const GRACE_PRESET_DAYS = [3, 7, 14];
export const PAUSE_PRESET_DAYS = [0, 7, 30];

/** Wallet balances below this (in UI units) count as dust and are tucked away in the picker. */
export const DUST_UI_AMOUNT = 0.000001;
/** Search text at least this long is treated as a pasted mint address. */
export const MINT_SEARCH_MIN_LEN = 32;
/** Jupiter Price API v3. Display-only USD values; the key lives in config. */
export const JUPITER_PRICE_API_URL = "https://api.jup.ag/price/v3";
/** Jupiter's price endpoint takes up to this many mints per call. */
export const PRICE_BATCH_SIZE = 50;
export const PRICE_STALE_MS = 60_000;

/**
 * Per-token instructions sent per transaction. A transaction may run at most 64 instructions
 * including every CPI, and each token instruction makes several (vault account, transfer,
 * record), so a batch stays well under that. The create transaction also carries the
 * initialize instruction and the name memo, so it takes fewer tokens.
 */
export const TOKEN_IXS_PER_TX = 6;
export const TOKEN_IXS_IN_CREATE_TX = 4;

/** Confirmation polling for the transaction progress view. */
export const TX_CONFIRM_POLL_MS = 1500;
export const TX_CONFIRM_TIMEOUT_MS = 90_000;

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
