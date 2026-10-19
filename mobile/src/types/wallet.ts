import type { Address } from "@solana/kit";

/** Why a wallet asset can't go into an estate yet. The vault only holds plain SPL token accounts. */
export type UnsupportedAssetReason = "programmable" | "compressed" | "core" | "frozen";

/** A token or NFT the connected wallet holds, with DAS metadata. */
export type WalletToken = {
  mint: string;
  symbol: string;
  name: string;
  /** Display balance, already formatted. */
  balance: string;
  /** Raw units held. */
  raw: bigint;
  decimals: number;
  /** Token or Token-2022, as DAS reported it. Undefined when DAS left it out. */
  tokenProgram?: Address;
  image?: string;
  /** False when DAS had neither a name nor a symbol for the mint. */
  named: boolean;
  /** USD value of the whole balance; null when DAS has no price. */
  usd: number | null;
  /** USD per whole token; null when DAS has no price. */
  usdPerToken: number | null;
  isNft: boolean;
  /** Set when the asset can't go into an estate; pickers show it greyed out. */
  unsupportedReason?: UnsupportedAssetReason;
};
