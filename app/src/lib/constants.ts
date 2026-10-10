import { getAssetRecordSize, getVaultSize, HeirloomInstruction } from "@historiah/heirloom";
import type { InstructionTraceCost } from "@/types/program";

export const SOL_LABEL = "SOL";
export const SOL_DECIMALS = 9;
/** SOL's mint for price lookups. Deposits use native SOL; this is only an id. */
export const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";
/** SOL that Max leaves in the wallet so the deposit can still pay its fee. */
export const SOL_MAX_RESERVE = 0.05;

export const USDC_LABEL = "USDC";
export const USDC_DECIMALS = 6;

export const LABEL_MAX_LEN = 32;

/** localStorage key for the last connected wallet account, so it reconnects on the next visit. */
export const SELECTED_WALLET_STORAGE_KEY = "heirloom:selected-wallet-account";

/** Base fee for one signature, in lamports. Priority fees aren't added by the app. */
export const NETWORK_FEE_LAMPORTS = 5000;
/** Bytes a new token registration rents: the vault's token account and the asset record PDA. */
export const TOKEN_ACCOUNT_SPACE = 165;
export const ASSET_RECORD_SPACE = getAssetRecordSize();
/** Bytes creating an estate rents: the estate account (Estate::LEN) and its vault. */
export const ESTATE_SPACE = 189;
export const VAULT_SPACE = getVaultSize();

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
 * The runtime caps a transaction's instruction trace — every instruction it runs, top-level
 * plus every CPI at any depth — at 64 (MAX_INSTRUCTION_TRACE_LENGTH in
 * solana-transaction-context). Separate from CPI depth, and v1 transactions don't raise it.
 */
export const MAX_INSTRUCTION_TRACE_LENGTH = 64;

/**
 * Trace entries each Heirloom instruction uses: itself plus its CPIs, for the token leg (a
 * mint is passed) and the SOL leg. Measured on litesvm from each transaction's inner
 * instructions; re-measure if the program changes. Where it varies, this is the higher one:
 * updateHeir's first token leg also creates the new estate and vault (11, later ones 9), and
 * a SOL-only updateHeir creates them too (3). Instructions not listed here (compute budget,
 * memo, plain transfers, updateField, delegateDefer) count as 1.
 */
export const HEIRLOOM_INSTRUCTION_TRACE_COSTS: Partial<
  Record<HeirloomInstruction, InstructionTraceCost>
> = {
  [HeirloomInstruction.Initialize]: { token: 10, sol: 4 },
  [HeirloomInstruction.RegisterAsset]: { token: 8, sol: 2 },
  [HeirloomInstruction.UpdateHeir]: { token: 11, sol: 3 },
  [HeirloomInstruction.Revoke]: { token: 9, sol: 1 },
  [HeirloomInstruction.Claim]: { token: 10, sol: 1 },
};

/** How long a copy button says "Copied" before it resets. */
export const COPIED_RESET_MS = 2000;

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
