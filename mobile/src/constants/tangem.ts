/**
 * Where the Tangem app keeps a Wallet 2.0 card's Solana key (SLIP-0010, the same path for
 * all its derivation styles). Reading the same path gives the address the Tangem app shows.
 */
export const TANGEM_SOLANA_DERIVATION_PATH = "m/44'/501'/0'";

/**
 * Largest Solana message the card signs directly. The Tangem app sends anything bigger
 * through an address lookup table instead (SOLANA_TRANSACTION_SIZE_THRESHOLD_BYTES).
 */
export const TANGEM_MAX_MESSAGE_BYTES = 930;

/** Tangem's wallet applet. A card that answers SELECT for it is a Tangem card. */
export const TANGEM_WALLET_AID = Uint8Array.of(0xa0, 0x00, 0x00, 0x08, 0x12, 0x01, 0x02, 0x08);

/**
 * After spotting a Tangem card on our own reader, how long to wait for it to be lifted off
 * before handing over to Tangem's reader, and how often to check.
 */
export const TANGEM_LIFT_TIMEOUT_MS = 10_000;
export const TANGEM_LIFT_POLL_MS = 250;

/** `code` on a Tangem call the user closed. */
export const TANGEM_CANCEL_CODE = "ERR_TANGEM_CANCELLED";
