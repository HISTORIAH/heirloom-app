import type { Address } from "@solana/kit";

import type { TapProgress } from "@/types/create";

export type NfcCapability =
  | { status: "checking" }
  | { status: "unsupported" }
  | { status: "disabled" }
  | { status: "ready" };

export type CardApduKind = "no_key" | "slot_full" | "not_heirloom" | "sw";

export type IsoDepTransceive = (apdu: Uint8Array) => Promise<Uint8Array>;

export type HardwareSigner = {
  getPublicKey(): Promise<Address>;
  generateKeypair(onProgress?: (progress: TapProgress) => void): Promise<Address>;
  signBytes(message: Uint8Array): Promise<Uint8Array>;
};

export type TagSummary = {
  idHex?: string;
  techs: string[];
  ndefType?: string;
  ndefRecordCount?: number;
  maxSize?: number;
  texts: string[];
};

export type CardScan =
  | { kind: "address"; value: string }
  | { kind: "cancelled" }
  | { kind: "empty" }
  | { kind: "off" }
  | { kind: "unsupported" }
  | { kind: "failed"; message: string };
