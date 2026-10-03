import { address } from "@solana/kit";

export const LAMPORTS_PER_SOL = 1_000_000_000n;
export const SOL_DECIMALS = 9;

export const SYSTEM_PROGRAM_ADDRESS = address("11111111111111111111111111111111");
export const TOKEN_PROGRAM_ADDRESS = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const TOKEN_2022_PROGRAM_ADDRESS = address("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const ASSOCIATED_TOKEN_PROGRAM_ADDRESS = address("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const TOKEN_PROGRAMS = [TOKEN_PROGRAM_ADDRESS, TOKEN_2022_PROGRAM_ADDRESS] as const;

/** Base58 run that can be a Solana address. */
export const ADDRESS_PATTERN = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
/** `solana:<address>` payment/receive URI. */
export const SOLANA_URI_PATTERN = /^solana:([1-9A-HJ-NP-Za-km-z]{32,44})/;

/** Polling a transaction or account until our RPC sees it. */
export const CONFIRM_POLL_MS = 400;
export const CONFIRM_POLL_TRIES = 30;
