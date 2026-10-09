/** A row in the Add asset token picker. SOL and estate tokens can be topped up; the rest are new. */
export type PickerToken = {
  mint: string;
  name: string;
  symbol: string;
  image?: string;
  decimals: number;
  /** Wallet balance in whole tokens. */
  balance: number;
  /** USD value of the whole wallet balance; undefined when there's no price. */
  usdValue?: number;
  usdPrice?: number;
  tokenProgram: string;
  isNft: boolean;
  /** Already registered in this estate, so adding is a top-up with no new vault. */
  inEstate: boolean;
  /** Native SOL, deposited straight into the estate's vault. */
  isSol: boolean;
  /** No name or symbol from metadata. Shown behind "Show other tokens". */
  unverified: boolean;
};
