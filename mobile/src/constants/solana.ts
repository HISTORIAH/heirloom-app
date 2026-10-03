import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022";
import { address } from "@solana/kit";

export const LAMPORTS_PER_SOL = 1_000_000_000n;
export const SOL_DECIMALS = 9;

export const TOKEN_PROGRAMS = [TOKEN_PROGRAM_ADDRESS, TOKEN_2022_PROGRAM_ADDRESS] as const;

/** Wrapped SOL. DAS prices native SOL under this mint. */
export const WSOL_MINT = address("So11111111111111111111111111111111111111112");
export const SOL_LOGO_URL =
  "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";

/** Base58 run that can be a Solana address. */
export const ADDRESS_PATTERN = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
/** `solana:<address>` payment/receive URI. */
export const SOLANA_URI_PATTERN = /^solana:([1-9A-HJ-NP-Za-km-z]{32,44})/;

/** Polling a transaction or account until our RPC sees it. */
export const CONFIRM_POLL_MS = 400;
export const CONFIRM_POLL_TRIES = 30;
