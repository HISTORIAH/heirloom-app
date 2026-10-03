/** 0.02 SOL. Floor is rent-exempt plus a realistic check-in life and one claim. */
export const CARD_FEE_FLOAT_LAMPORTS = 20_000_000n;
/** Left in the wallet when the owner taps MAX, so the create transaction can pay its own way. */
export const CREATE_FEE_RESERVE_LAMPORTS = 10_000_000n;
/** Left in the wallet when the owner taps MAX on a SOL top-up, so the transfer can pay its fee. */
export const TOP_UP_FEE_RESERVE_LAMPORTS = 1_000_000n;
/** Base fee of a one-signature transaction. */
export const NETWORK_FEE_LAMPORTS = 5_000n;
/**
 * Rent to open a new token in an estate: the vault token account (165 bytes)
 * plus its asset record (21 bytes), at 6,960 lamports per byte incl. the 128-byte header.
 */
export const TOKEN_OPEN_RENT_LAMPORTS = 3_076_320n;
