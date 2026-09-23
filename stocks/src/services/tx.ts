import {
  isSolanaError,
  signature as toSignature,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
  type GetSignatureStatusesApi,
  type Instruction,
  type Rpc,
  type TransactionSigner,
} from "@solana/kit";
import {
  HEIRLOOM_STOCKS_ERROR__ACCOUNT_FROZEN,
  HEIRLOOM_STOCKS_ERROR__ALREADY_DEFERRED,
  HEIRLOOM_STOCKS_ERROR__ASSET_PAUSED,
  HEIRLOOM_STOCKS_ERROR__CPI_GUARD_ENABLED,
  HEIRLOOM_STOCKS_ERROR__DEFER_WINDOW_EXPIRED,
  HEIRLOOM_STOCKS_ERROR__DELEGATE_AMOUNT_TOO_LOW,
  HEIRLOOM_STOCKS_ERROR__DELEGATE_EVICTED,
  HEIRLOOM_STOCKS_ERROR__FROZEN_BY_DEFAULT_MINT,
  HEIRLOOM_STOCKS_ERROR__INSUFFICIENT_BALANCE,
  HEIRLOOM_STOCKS_ERROR__INVALID_ALLOCATION,
  HEIRLOOM_STOCKS_ERROR__ISSUER_NOT_SUPPORTED,
  HEIRLOOM_STOCKS_ERROR__NON_TRANSFERABLE_MINT,
  HEIRLOOM_STOCKS_ERROR__NOT_YET_RECOVERABLE,
  HEIRLOOM_STOCKS_ERROR__PERMANENT_DELEGATE_ADDED,
  HEIRLOOM_STOCKS_ERROR__PLAN_NOT_EMPTY,
  HEIRLOOM_STOCKS_ERROR__TRANSFER_HOOK_UNSUPPORTED,
  HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED,
} from "@historiah/heirloom-stocks";
import { sendTx, type StocksClient } from "@/lib/stocks";

/**
 * Program errors the UI has its own words for, keyed by the name used in the
 * `stocks` namespace (`errors.<name>`). The generated client strips its own
 * messages from production builds, so it cannot be relied on for copy.
 */
export const PROGRAM_ERROR_KEYS: Record<number, string> = {
  [HEIRLOOM_STOCKS_ERROR__UNAUTHORIZED]: "unauthorized",
  [HEIRLOOM_STOCKS_ERROR__NOT_YET_RECOVERABLE]: "notYetRecoverable",
  [HEIRLOOM_STOCKS_ERROR__ALREADY_DEFERRED]: "alreadyDeferred",
  [HEIRLOOM_STOCKS_ERROR__DEFER_WINDOW_EXPIRED]: "deferWindowExpired",
  [HEIRLOOM_STOCKS_ERROR__INSUFFICIENT_BALANCE]: "insufficientBalance",
  [HEIRLOOM_STOCKS_ERROR__INVALID_ALLOCATION]: "invalidAllocation",
  [HEIRLOOM_STOCKS_ERROR__PLAN_NOT_EMPTY]: "planNotEmpty",
  [HEIRLOOM_STOCKS_ERROR__ISSUER_NOT_SUPPORTED]: "issuerNotSupported",
  [HEIRLOOM_STOCKS_ERROR__FROZEN_BY_DEFAULT_MINT]: "frozenByDefault",
  [HEIRLOOM_STOCKS_ERROR__TRANSFER_HOOK_UNSUPPORTED]: "transferHook",
  [HEIRLOOM_STOCKS_ERROR__ASSET_PAUSED]: "assetPaused",
  [HEIRLOOM_STOCKS_ERROR__ACCOUNT_FROZEN]: "accountFrozen",
  [HEIRLOOM_STOCKS_ERROR__NON_TRANSFERABLE_MINT]: "nonTransferable",
  [HEIRLOOM_STOCKS_ERROR__CPI_GUARD_ENABLED]: "cpiGuard",
  [HEIRLOOM_STOCKS_ERROR__PERMANENT_DELEGATE_ADDED]: "permanentDelegateAdded",
  [HEIRLOOM_STOCKS_ERROR__DELEGATE_EVICTED]: "delegateEvicted",
  [HEIRLOOM_STOCKS_ERROR__DELEGATE_AMOUNT_TOO_LOW]: "delegateEvicted",
};

/**
 * The custom program error code inside a failure, wherever it surfaced: kit
 * nests it in a `cause` chain when it simulates the transaction, while wallets
 * that send for us usually only say "custom program error: 0x…" in a message.
 */
export function programErrorCode(error: unknown): number | null {
  for (let e: unknown = error; e; e = (e as { cause?: unknown }).cause) {
    if (isSolanaError(e, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM)) return e.context.code;
    const message = e instanceof Error ? e.message : typeof e === "string" ? e : "";
    const hex = /custom program error: 0x([0-9a-f]+)/i.exec(message);
    if (hex) return parseInt(hex[1]!, 16);
    if (!(e instanceof Error)) break;
  }
  return null;
}

/** The `errors.<name>` key for a failure, or null when there is no specific copy. */
export function programErrorKey(error: unknown): string | null {
  const code = programErrorCode(error);
  return code === null ? null : (PROGRAM_ERROR_KEYS[code] ?? null);
}

export function isUserRejection(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /reject|denied|cancel/i.test(message);
}

export class TransactionFailedError extends Error {
  constructor(
    readonly signature: string,
    readonly err: unknown,
  ) {
    super(`Transaction ${signature} failed: ${JSON.stringify(err)}`);
    this.name = "TransactionFailedError";
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Waits until `sig` is confirmed. A wallet that sends for us returns as soon as
 * the transaction is submitted, and the next read would otherwise race it.
 */
export async function confirmSignature(
  rpc: Rpc<GetSignatureStatusesApi>,
  sig: string,
  { timeoutMs = 60_000, intervalMs = 800 } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { value } = await rpc.getSignatureStatuses([toSignature(sig)]).send();
    const status = value[0];
    if (status?.err) throw new TransactionFailedError(sig, status.err);
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
      return;
    }
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for ${sig} to confirm`);
}

/**
 * Sends each group of instructions as its own transaction, in order, waiting
 * for each to confirm. Returns the signatures.
 */
export async function sendAndConfirm(
  client: StocksClient,
  feePayer: TransactionSigner,
  batches: Instruction[][],
): Promise<string[]> {
  const signatures: string[] = [];
  for (const instructions of batches) {
    if (instructions.length === 0) continue;
    const sig = await sendTx(client, feePayer, instructions);
    await confirmSignature(client.rpc, sig);
    signatures.push(sig);
  }
  return signatures;
}
