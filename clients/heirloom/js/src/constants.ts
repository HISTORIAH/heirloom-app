import { address } from "@solana/kit";

export const TREASURY_ADDRESS = address("tr31o8FF9v2rEukh84ZwjRQgYa3x74PHssighePMP1Q")

/** Flat fee per NFT deposited (0.01 SOL). Mirrors `NFT_DEPOSIT_FEE_LAMPORTS` in the program. */
export const NFT_DEPOSIT_FEE_LAMPORTS = 10_000_000n
