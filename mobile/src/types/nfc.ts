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

/** A Tangem card's Solana key, and what the card needs to sign with it again. */
export type TangemCredential = {
  cardId: string;
  address: Address;
  /** The wallet's own key, hex. The card finds the wallet by it. */
  walletPublicKey: string;
  /** Null on cards without HD wallets, where the wallet key is the Solana key. */
  derivationPath: string | null;
};

/** The kinds of NFC card that can hold an heir's key. Each one has an adapter in lib/nfc/credentials. */
export type CredentialKind = "heirloom" | "tangem";

/** What a card kind can do, so shared code never has to ask which card it is. */
export type CredentialAdapter = {
  kind: CredentialKind;
  label: string;
  /** Largest compiled Solana message the card signs. Claims and sends are packed to fit. */
  maxMessageBytes: number;
  /** The card's own sheet asks for its code (Tangem's access code), so we don't show our PIN pad. */
  asksForOwnCode: boolean;
};

/** What this phone remembers about a credential, so signing later talks to the right card. */
export type CredentialRecord =
  | { kind: "heirloom"; address: Address }
  | ({ kind: "tangem" } & TangemCredential);

/**
 * One signing session with a card: its address plus a Kit signer. Every transaction handed to the
 * signer in one call is signed in one hold (Heirloom) or one tap (Tangem).
 */
export type CardSigningSession = {
  address: Address;
  signer: TransactionSigner;
  pin: PinStatus;
  unlock: () => Promise<void>;
  maxMessageBytes: number;
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
  /** Not ours, but a Tangem card: read it through Tangem's SDK instead. */
  | { kind: "tangem" }
  | { kind: "cancelled" }
  | { kind: "empty" }
  | { kind: "off" }
  | { kind: "unsupported" }
  | { kind: "failed"; message: string };
