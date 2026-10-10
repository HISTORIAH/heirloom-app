import {
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  SOLANA_ERROR__TRANSACTION_ERROR__ACCOUNT_NOT_FOUND,
  SOLANA_ERROR__TRANSACTION_ERROR__BLOCKHASH_NOT_FOUND,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT,
  isSolanaError,
  type SolanaErrorCode,
} from "@solana/kit";
import { findLogs } from "@/lib/heirloom/client";
import { errMsg } from "@/lib/utils";
import type { TxFailure } from "@/types/tx";

/** EIP-1193's "user rejected the request", which Solana wallets reuse. */
const USER_REJECTED_CODE = 4001;
const REJECTION_MESSAGE = /reject|declin|denied|cancel/i;
const EXPIRED_CODES: SolanaErrorCode[] = [
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  SOLANA_ERROR__TRANSACTION_ERROR__BLOCKHASH_NOT_FOUND,
];
const OUT_OF_SOL_CODES: SolanaErrorCode[] = [
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT,
  // A fee payer with no SOL at all doesn't exist on-chain yet.
  SOLANA_ERROR__TRANSACTION_ERROR__ACCOUNT_NOT_FOUND,
];
/** The system program's log when a transfer or account creation runs out of SOL. */
const OUT_OF_SOL_LOG = /insufficient lamports/i;
const TIMEOUT_MESSAGE = /timed? ?out|expired/i;
/** Anchor's readable line in the logs: "... Error Message: Zero deposit amount." */
const ANCHOR_ERROR_MESSAGE = /Error Message: (.+?)\.?$/;
const FAILED_LOG_LINE = /error|failed/i;

/** The error and every `cause` under it. Kit and the wallet wrap errors several deep. */
function causeChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current = error;
  while (current && typeof current === "object" && !chain.includes(current)) {
    chain.push(current);
    current = (current as { cause?: unknown }).cause;
  }
  return chain;
}

function isRejection(error: unknown): boolean {
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (code === USER_REJECTED_CODE) return true;
  return typeof message === "string" && REJECTION_MESSAGE.test(message);
}

function hasCode(chain: unknown[], codes: SolanaErrorCode[]): boolean {
  return chain.some((error) => codes.some((code) => isSolanaError(error, code)));
}

/** The program's own reason, from the simulation logs. Kit's production errors are just codes. */
function programReason(logs: readonly string[]): string | null {
  const failure = [...logs].reverse().find((line) => FAILED_LOG_LINE.test(line));
  if (!failure) return null;
  return failure.match(ANCHOR_ERROR_MESSAGE)?.[1] ?? failure;
}

/** Sorts a failed send into what the user is told: declined, out of SOL, expired, or refused. */
export function classifyTxError(error: unknown): TxFailure {
  const chain = causeChain(error);
  if (chain.some(isRejection)) return { kind: "rejected", detail: null };

  const logs = chain.map(findLogs).find((found) => found?.length) ?? [];
  if (hasCode(chain, OUT_OF_SOL_CODES) || logs.some((line) => OUT_OF_SOL_LOG.test(line))) {
    return { kind: "insufficientSol", detail: null };
  }
  if (hasCode(chain, EXPIRED_CODES) || TIMEOUT_MESSAGE.test(errMsg(error, ""))) {
    return { kind: "expired", detail: null };
  }

  const reason = programReason(logs);
  if (reason) return { kind: "program", detail: reason };
  return { kind: "unknown", detail: errMsg(error, "") || null };
}
