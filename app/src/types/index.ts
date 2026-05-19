export type VaultTokenHolding = {
  mint: string;
  ata: string;
  rawAmount: bigint;
  decimals: number;
  tokenProgram: string;
};

export type SplTokenAsset = {
  mint: string;
  label: string;
  name?: string;
  symbol?: string;
  image?: string;
  decimals: number;
  uiAmount: number;
  amount: bigint;
  tokenProgram: string;
};
