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

export function cardProblemMessage(cause: unknown, fallback: string): string {
  if (isCardApduError(cause)) {
    if (cause.kind === "slot_full") return "This credential already has a key.";
    if (cause.kind === "not_heirloom") return "This isn’t an Heirloom credential.";
    if (cause.kind === "no_key") return "We couldn’t read a key from it. Try again.";
  }
  return errorMessage(cause, fallback);
}

export function setupProblemMessage(result: ScanProblem): string {
  if (result.kind === "off") return "NFC is off. Turn it on, then try again.";
  if (result.kind === "unsupported") return "This phone can’t set up credentials.";
  if (result.kind === "empty") return "We couldn’t read a key from it. Try again.";
  return result.message;
}
