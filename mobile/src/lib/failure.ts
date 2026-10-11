import { isSolanaError, SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR } from "@solana/kit";

import { CONNECT_ACTION } from "@/constants/ui";
import { isCardProblem, knownCardProblem } from "@/lib/nfc/messages";
import { classifyTxError } from "@/lib/solana/txErrors";
import { errorMessage, isUserCancel } from "@/lib/text";
import type { FailureKind, FailureView } from "@/types/ui";

/**
 * Thrown when a transaction was already handed to the network and something failed after that
 * (usually waiting for confirmation). It may still land, so the copy mustn't say "wasn't sent".
 */
export class SubmittedTxError extends Error {
  constructor(cause: unknown) {
    super(errorMessage(cause, "Failed after sending"), { cause });
    this.name = "SubmittedTxError";
  }
}

/** Java's CancellationException: the wallet prompt was dismissed. */
const CANCELLED_TEXT = /CancellationException/;
/** MWA couldn't open a session with the wallet app: it never answered on its local socket. */
const WALLET_UNREACHABLE_TEXT =
  /ConnectionFailedException|Unable to connect to websocket|local association|Session not established/i;
const NO_WALLET_TEXT = /ERROR_WALLET_NOT_FOUND|no installed wallet|ActivityNotFoundException/i;
const NETWORK_TEXT =
  /Network request failed|fetch failed|ECONNRESET|ENOTFOUND|ETIMEDOUT|socket hang up/i;
/** Hallmarks of a native or library error, as opposed to a sentence our own code wrote. */
const RAW_TEXT = /exception|java\.|kotlin\.|\bat [\w.$]+\(|\bundefined\b|\bnull\b|[{}[\]<>]/i;

const MAY_LAND = "It may still go through. Check again in a minute.";

function causeChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current = error;
  while (current && typeof current === "object" && !chain.includes(current)) {
    chain.push(current);
    current = (current as { cause?: unknown }).cause;
  }
  return chain;
}

function codeOf(error: unknown): unknown {
  return (error as { code?: unknown } | null)?.code;
}

/** Every message and code in the chain, for pattern checks. */
function chainText(chain: unknown[]): string {
  return chain
    .map((error) => `${String(codeOf(error) ?? "")} ${errorMessage(error, "")}`)
    .join(" | ");
}

/**
 * A plain `Error` with no code and sentence-like text: written by our own code for the user
 * ("Pick a wallet that isn't this credential."). Native and library errors carry a code, a
 * subclass or tell-tale text, and stay under "Technical details".
 */
function ourSentence(error: unknown): string | undefined {
  if (!(error instanceof Error) || error.constructor !== Error || codeOf(error) !== undefined)
    return undefined;
  const text = error.message.trim();
  if (text.length === 0 || RAW_TEXT.test(text)) return undefined;
  return text;
}

function kindOf(error: unknown, chain: unknown[], text: string): FailureKind {
  const tx = classifyTxError(error);
  if (tx.kind === "rejected" || chain.some(isUserCancel) || CANCELLED_TEXT.test(text))
    return "cancelled";
  if (NO_WALLET_TEXT.test(text)) return "noWallet";
  if (WALLET_UNREACHABLE_TEXT.test(text)) return "walletUnreachable";
  if (chain.some(isCardProblem) && chain.some((e) => knownCardProblem(e) !== undefined))
    return "card";
  if (tx.kind === "insufficientSol" || tx.kind === "expired" || tx.kind === "program")
    return tx.kind;
  const transport = chain.some((e) => isSolanaError(e, SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR));
  if (transport || NETWORK_TEXT.test(text)) return "network";
  if (chain.some((e) => ourSentence(e) !== undefined)) return "known";
  return "unknown";
}

/**
 * Turns anything thrown by `action` ("Check-in", "Claim") into what the user sees. Every failure
 * sheet and toast goes through here; raw error text only ever lands in `details`.
 */
export function describeFailure(error: unknown, action: string): FailureView {
  const chain = causeChain(error);
  const text = chainText(chain);
  const kind = kindOf(error, chain, text);
  const submitted = chain.some((e) => e instanceof SubmittedTxError);
  const details = errorMessage(error, "") || null;
  const notSent = submitted
    ? MAY_LAND
    : action === CONNECT_ACTION
      ? "Nothing was sent."
      : `Your ${action.toLowerCase()} wasn’t sent.`;
  const sheet = (title: string, body: string): FailureView => ({
    kind,
    presentation: "sheet",
    title,
    body,
    details,
  });

  switch (kind) {
    case "cancelled":
      return {
        kind,
        presentation: "toast",
        title: `${action} cancelled. Nothing was signed.`,
        body: "",
        details,
      };
    case "walletUnreachable":
      return sheet(
        "Couldn’t reach your wallet",
        `Your wallet app didn’t answer. Open it once so it’s running, then try again. ${notSent}`,
      );
    case "noWallet":
      return sheet("No wallet app found", "Install a Solana wallet app, then try again.");
    case "network":
      return sheet(
        "Couldn’t reach Solana",
        submitted
          ? `Check your connection. ${MAY_LAND}`
          : "Check your connection and try again. Nothing was sent.",
      );
    case "insufficientSol":
      return sheet(
        "Not enough SOL",
        "This wallet needs a little more SOL to cover the network fee.",
      );
    case "expired":
      return sheet(
        "It didn’t go through in time",
        "The network didn’t pick it up in time. Nothing was taken. Try again.",
      );
    case "program":
      return sheet(
        `${action} was refused`,
        classifyTxError(error).detail ?? "The program refused it.",
      );
    case "card":
      return sheet(
        "The card couldn’t finish",
        chain.map(knownCardProblem).find((m) => m !== undefined) ?? "",
      );
    case "known":
      return sheet(
        `${action} didn’t go through`,
        chain.map(ourSentence).find((m) => m !== undefined) ?? "",
      );
    case "unknown":
      return sheet(
        "Something went wrong",
        `${notSent} Try again, and if it keeps happening, copy the details below and send them to us.`,
      );
  }
}

/** One line for an inline error (under a field, in a card): ours if we wrote it, never raw text. */
export function failureLine(error: unknown, action: string): string {
  const view = describeFailure(error, action);
  return view.kind === "known" || view.kind === "card" || view.kind === "program"
    ? view.body
    : view.title;
}
