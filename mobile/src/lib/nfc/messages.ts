import type { CardScan } from "@/types/nfc";

type ScanProblem = Exclude<CardScan, { kind: "address" | "cancelled" }>;

/** One sentence for a scan that didn't produce an address. */
export function scanProblemMessage(result: ScanProblem, blank = "This credential is blank. Set it up for someone."): string {
  if (result.kind === "off") return "NFC is off. Turn it on, then try again.";
  if (result.kind === "unsupported") return "This phone can’t read credentials.";
  if (result.kind === "empty") return blank;
  return result.message;
}
