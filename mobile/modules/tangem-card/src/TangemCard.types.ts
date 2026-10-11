/** One Ed25519-family wallet on the card. Keys are hex. */
export type TangemWallet = {
  curve: "ed25519_slip0010" | "ed25519";
  /** The wallet's own key. Signing names the wallet by this. */
  publicKey: string;
  /** The key at the derivation path `scan` was given. Null on cards without HD wallets. */
  derivedPublicKey: string | null;
};

export type TangemScan = {
  cardId: string;
  firmwareVersion: string;
  hdWalletAllowed: boolean;
  wallets: TangemWallet[];
};

export type TangemSignRequest = {
  cardId: string;
  walletPublicKey: string;
  /** Null signs with the wallet key itself. */
  derivationPath: string | null;
  /** Message bytes, hex. One tap signs them all. */
  messages: string[];
};

/** `code` on a rejected call. Anything else from the SDK is `ERR_TANGEM`. */
export type TangemErrorCode =
  | "ERR_TANGEM_CANCELLED"
  | "ERR_TANGEM_TAG_LOST"
  | "ERR_TANGEM_NFC_UNAVAILABLE"
  | "ERR_TANGEM_WALLET_NOT_FOUND"
  | "ERR_TANGEM_NO_ACTIVITY"
  | "ERR_TANGEM";
