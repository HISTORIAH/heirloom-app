import type { Address, TransactionSigner } from "@solana/kit";

import type { TapProgress } from "@/types/create";

export type NfcCapability =
  | { status: "checking" }
  | { status: "unsupported" }
  | { status: "disabled" }
  | { status: "ready" };

export type CardApduKind =
  | "no_key"
  | "slot_full"
  | "not_heirloom"
  | "sw"
  | "pin_required"
  | "pin_wrong"
  | "pin_blocked"
  | "pin_unsupported";

/** PIN state from GET_STATUS. v1 CAPs that lack the INS are `none`. */
export type PinStatus =
  | { kind: "none" }
  | { kind: "set"; triesLeft: number }
  | { kind: "blocked" };

export type IsoDepTransceive = (apdu: Uint8Array) => Promise<Uint8Array>;

export type HardwareSigner = {
  getPublicKey(): Promise<Address>;
  generateKeypair(onProgress?: (progress: TapProgress) => void, pin?: Uint8Array): Promise<Address>;
  signBytes(message: Uint8Array): Promise<Uint8Array>;
};

/** One IsoDep hold: the card address plus a Kit signer that SIGNs on that field. */
export type CardSigningSession = {
  address: Address;
  signer: TransactionSigner;
  pin: PinStatus;
  unlock: () => Promise<void>;
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
  | { kind: "address"; value: string; pin: PinStatus }
  | { kind: "cancelled" }
  | { kind: "empty" }
  | { kind: "off" }
  | { kind: "unsupported" }
  | { kind: "failed"; message: string };
