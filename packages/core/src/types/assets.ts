/** Shapes returned by the Helius DAS API. Only the fields the apps read are typed. */

export type DasFile = { uri?: string; cdn_uri?: string; mime?: string };

export type DasContent = {
  metadata?: { name?: string; symbol?: string };
  links?: { image?: string };
  files?: DasFile[];
};

/** USD price DAS attaches to well-known fungibles. Absent for most long-tail mints. */
export type DasPriceInfo = { price_per_token?: number; total_price?: number; currency?: string };

export type DasTokenInfo = {
  /** Raw amount held by the owner. Can arrive as a string for large balances. */
  balance?: string | number;
  decimals?: number;
  symbol?: string;
  token_program?: string;
  price_info?: DasPriceInfo;
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

export type DasRpcResponse<T> = {
  result?: T;
  error?: { code?: number; message?: string };
};

export type DasAssetPage = { items?: Array<DasAsset | null> };

/** Name, symbol and image to show for an asset. Blank values from DAS come back undefined. */
export type AssetDisplay = { name?: string; symbol?: string; image?: string };

/** Why a wallet asset can't go into an estate yet. The vault only holds plain SPL token accounts. */
export type UnsupportedAssetReason = "programmable" | "compressed" | "core" | "frozen";
