/** Shapes returned by the Helius DAS API. Only the fields the app reads are typed. */

export type DasFile = { uri?: string; cdn_uri?: string; mime?: string };

export type DasContent = {
  metadata?: { name?: string; symbol?: string };
  links?: { image?: string };
  files?: DasFile[];
};

export type DasTokenInfo = {
  /** Raw amount held by the owner. Can arrive as a string for large balances. */
  balance?: string | number;
  decimals?: number;
  symbol?: string;
  token_program?: string;
};

export type DasAsset = {
  id: string;
  /** e.g. "FungibleToken", "FungibleAsset", "V1_NFT", "ProgrammableNFT", "MplCoreAsset". */
  interface?: string;
  content?: DasContent;
  token_info?: DasTokenInfo;
  ownership?: { frozen?: boolean; owner?: string };
  /** Compressed NFTs live in a merkle tree, not a token account. */
  compression?: { compressed?: boolean };
  burnt?: boolean;
};

export type DasAssetDisplay = { name?: string; symbol?: string; image?: string };

export type DasRpcResponse<T> = {
  result?: T;
  error?: { code?: number; message?: string };
};

export type DasAssetPage = {
  total?: number;
  limit?: number;
  page?: number;
  items?: Array<DasAsset | null>;
};
