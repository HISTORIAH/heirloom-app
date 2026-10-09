import { isCardApduError } from "./apdu";
import { errorMessage } from "../text";
import type { CardScan } from "@/types/nfc";

type ScanProblem = Exclude<CardScan, { kind: "address" | "cancelled" }>;

export function scanProblemMessage(
  result: ScanProblem,
  blank = "This credential is blank. Set it up for someone.",
): string {
  if (result.kind === "off") return "NFC is off. Turn it on, then try again.";
  if (result.kind === "unsupported") return "This phone can’t read credentials.";
  if (result.kind === "empty") return blank;
  return result.message;
}

/** The field dropped while they were still finding the antenna. */
export function isLostField(cause: unknown): boolean {
  const ctor = cause instanceof Error ? cause.constructor.name : "";
  if (ctor === "TagConnectionLost" || ctor === "Timeout" || ctor === "TagNotConnected") return true;
  const raw = cause instanceof Error ? cause.message : String(cause ?? "");
  return /tag (was )?lost|connection lost|not connected|transceive fail|timeout/i.test(raw);
}

function pinWrongMessage(sw: number): string {
  const left = sw & 0x0f;
  if (left === 1) return "That PIN didn’t match. 1 try left.";
  return `That PIN didn’t match. ${left} tries left.`;
}

export function cardProblemMessage(cause: unknown, fallback: string): string {
  if (isCardApduError(cause)) {
    if (cause.kind === "slot_full") return "This credential already has a key.";
    if (cause.kind === "not_heirloom") return "This isn’t an Heirloom credential.";
    if (cause.kind === "no_key") return "We couldn’t read a key from it. Try again.";
    if (cause.kind === "pin_required") return "Enter the PIN for this credential.";
    if (cause.kind === "pin_wrong") return pinWrongMessage(cause.sw);
    if (cause.kind === "pin_blocked") return "This credential is locked. It can’t sign.";
    if (cause.kind === "pin_unsupported") {
      return "This credential needs a reload before it can take a PIN.";
    }
  }
  if (isLostField(cause)) {
    return "Couldn’t keep the card in range. Slide it slowly around the top of the back, then hold still.";
  }
  return errorMessage(cause, fallback);
}

export function setupProblemMessage(result: ScanProblem): string {
  if (result.kind === "off") return "NFC is off. Turn it on, then try again.";
  if (result.kind === "unsupported") return "This phone can’t set up credentials.";
  if (result.kind === "empty") return "We couldn’t read a key from it. Try again.";
  return result.message;
}
