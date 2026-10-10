import {
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  SOLANA_ERROR__TRANSACTION_ERROR__ACCOUNT_NOT_FOUND,
  SOLANA_ERROR__TRANSACTION_ERROR__BLOCKHASH_NOT_FOUND,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT,
  isSolanaError,
  type SolanaErrorCode,
} from "@solana/kit";

import { errorMessage, isUserCancel } from "@/lib/text";
import type { TxFailure, TxFailureKind } from "@/types/tx";

/**
 * MWA protocol errors for "the user said no": declined authorization (-1) or declined to
 * sign (-3). Read off `code` so we don't depend on the protocol package directly.
 */
const MWA_DECLINED_CODES: unknown[] = [-1, -3, "ERROR_ASSOCIATION_CANCELLED"];
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
/** The system program's log (or a wallet's relayed message) when SOL runs out. */
const OUT_OF_SOL_TEXT = /insufficient (lamports|funds)/i;
/** Blockhash ran out before it landed. Not MWA's session timeout, which is the wallet never opening. */
const TIMEOUT_TEXT = /block ?height exceeded|blockhash (not found|expired)|transaction expired/i;
/** Anchor's readable line in the logs: "... Error Message: Zero deposit amount." */
const ANCHOR_ERROR_MESSAGE = /Error Message: (.+?)\.?$/;
const FAILED_LOG_LINE = /error|failed/i;

const FAILURE_COPY: Record<Exclude<TxFailureKind, "program" | "unknown">, string> = {
  rejected: "Signing cancelled.",
  insufficientSol: "Not enough SOL in this wallet to cover the network fee.",
  expired: "The network didn’t pick this up in time. Try again.",
};

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

/** Simulation logs, when kit attached them (our own sends: the card path, preflight). */
function logsOf(error: unknown): readonly string[] {
  const context = (error as { context?: { logs?: readonly string[] } }).context;
  return context?.logs ?? [];
}

function isDeclined(error: unknown): boolean {
  return MWA_DECLINED_CODES.includes((error as { code?: unknown }).code) || isUserCancel(error);
}

function hasCode(chain: unknown[], codes: SolanaErrorCode[]): boolean {
  return chain.some((error) => codes.some((code) => isSolanaError(error, code)));
}

/** The program's own reason from the logs. Kit's production errors are just codes. */
function programReason(logs: readonly string[]): string | null {
  const failure = [...logs].reverse().find((line) => FAILED_LOG_LINE.test(line));
  if (!failure) return null;
  return failure.match(ANCHOR_ERROR_MESSAGE)?.[1] ?? failure;
}

/** Sorts a failed send into what the user is told: declined, out of SOL, expired, or refused. */
export function classifyTxError(error: unknown): TxFailure {
  const chain = causeChain(error);
  if (chain.some(isDeclined)) return { kind: "rejected", detail: null };

  const logs = chain.map(logsOf).find((found) => found.length > 0) ?? [];
  const text = errorMessage(error, "");
  const outOfSol =
    hasCode(chain, OUT_OF_SOL_CODES) ||
    OUT_OF_SOL_TEXT.test(text) ||
    logs.some((line) => OUT_OF_SOL_TEXT.test(line));
  if (outOfSol) return { kind: "insufficientSol", detail: null };
  if (hasCode(chain, EXPIRED_CODES) || TIMEOUT_TEXT.test(text)) {
    return { kind: "expired", detail: null };
  }

  const reason = programReason(logs);
  if (reason) return { kind: "program", detail: reason };
  return { kind: "unknown", detail: text || null };
}

/** One line for the user about any failure. Non-transaction errors fall through to their message. */
export function txFailureMessage(error: unknown, fallback: string): string {
  const failure = classifyTxError(error);
  if (failure.kind === "program" || failure.kind === "unknown") return failure.detail ?? fallback;
  return FAILURE_COPY[failure.kind];
}
