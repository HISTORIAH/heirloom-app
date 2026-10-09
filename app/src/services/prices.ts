import { JUPITER_API_KEY } from "@/config";
import { JUPITER_PRICE_API_URL, PRICE_BATCH_SIZE } from "@/lib/constants";
import type { JupiterPriceResponse, UsdPriceMap } from "@/types/prices";

/** Splits `items` into groups of at most `size`. */
function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}

/** One request to Jupiter for up to PRICE_BATCH_SIZE mints. */
async function fetchPriceBatch(mints: string[], signal?: AbortSignal): Promise<UsdPriceMap> {
  const url = `${JUPITER_PRICE_API_URL}?ids=${mints.join(",")}`;
  const response = await fetch(url, {
    headers: { "x-api-key": JUPITER_API_KEY },
    signal,
  });
  if (!response.ok) throw new Error(`Jupiter price request failed (${response.status})`);

  const body = (await response.json()) as JupiterPriceResponse;
  const prices: UsdPriceMap = new Map();
  for (const [mint, entry] of Object.entries(body)) {
    // Jupiter leaves out mints it can't price reliably; guard anyway.
    if (typeof entry?.usdPrice === "number") prices.set(mint, entry.usdPrice);
  }
  return prices;
}

/**
 * USD prices for `mints` from Jupiter. Mints without a price are left out of the map.
 * Without an API key nothing is fetched and the map is empty.
 */
export async function fetchUsdPrices(mints: string[], signal?: AbortSignal): Promise<UsdPriceMap> {
  if (!JUPITER_API_KEY || mints.length === 0) return new Map();

  const batches = await Promise.all(
    chunk(mints, PRICE_BATCH_SIZE).map((batch) => fetchPriceBatch(batch, signal)),
  );
  return new Map(batches.flatMap((prices) => [...prices]));
}
