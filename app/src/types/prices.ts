/** One mint's entry in a Jupiter Price API v3 response. Other fields are ignored. */
export type JupiterPriceEntry = {
  usdPrice?: number;
};

export type JupiterPriceResponse = Record<string, JupiterPriceEntry | null>;

/** USD price per whole token, keyed by mint. Mints Jupiter can't price are absent. */
export type UsdPriceMap = Map<string, number>;
