import type { TangemErrorCode } from "@modules/tangem-card";

import { TANGEM_CANCEL_CODE } from "@/constants/tangem";
import { errorMessage } from "@/lib/text";

const TANGEM_COPY: Partial<Record<TangemErrorCode, string>> = {
  ERR_TANGEM_TAG_LOST: "The card moved away. Hold it still against the back of the phone.",
  ERR_TANGEM_NFC_UNAVAILABLE: "NFC is off or missing. Turn it on, then try again.",
  ERR_TANGEM_WALLET_NOT_FOUND: "This card doesn’t hold the key we registered. Is it the right card?",
  ERR_TANGEM_NO_ACTIVITY: "Couldn’t open the card reader. Try again.",
};

function codeOf(cause: unknown): unknown {
  return (cause as { code?: unknown } | null)?.code;
}

/** They closed Tangem's sheet. Not a failure worth a message. */
export function isTangemCancel(cause: unknown): boolean {
  return codeOf(cause) === TANGEM_CANCEL_CODE;
}

/** Any failure from a Tangem call. */
export function isTangemError(cause: unknown): boolean {
  const code = codeOf(cause);
  return typeof code === "string" && code.startsWith("ERR_TANGEM");
}

/** Our wording for a Tangem failure we recognise. Undefined for anything else. */
export function knownTangemProblem(cause: unknown): string | undefined {
  return TANGEM_COPY[codeOf(cause) as TangemErrorCode];
}

/** One line for the user about a failed Tangem call. */
export function tangemProblemMessage(cause: unknown, fallback: string): string {
  const code = codeOf(cause) as TangemErrorCode;
  return TANGEM_COPY[code] ?? errorMessage(cause, fallback);
}
