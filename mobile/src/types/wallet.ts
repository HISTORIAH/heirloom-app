/** A fungible token the connected wallet holds, with DAS metadata. */
export type WalletToken = {
  mint: string;
  symbol: string;
  name: string;
  /** Display balance, already formatted. */
  balance: string;
  /** Raw units held. */
  raw: bigint;
  decimals: number;
  tokenProgram: string;
  image?: string;
  /** False when DAS had neither a name nor a symbol for the mint. */
  named: boolean;
  /** USD value of the whole balance; null when DAS has no price. */
  usd: number | null;
  /** USD per whole token; null when DAS has no price. */
  usdPerToken: number | null;
};
