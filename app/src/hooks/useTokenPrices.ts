import { useQuery } from "@tanstack/react-query";
import { fetchUsdPrices } from "@/services/prices";
import { JUPITER_API_KEY } from "@/config";
import { PRICE_STALE_MS } from "@/lib/constants";
import type { UsdPriceMap } from "@/types/prices";

/**
 * USD prices for the given mints. Display-only: a failed or empty fetch leaves the
 * map empty and the UI falls back to "No price".
 */
export function useTokenPrices(mints: string[]) {
  const key = Array.from(new Set(mints)).sort();
  return useQuery<UsdPriceMap>({
    queryKey: ["usd-prices", key],
    queryFn: ({ signal }) => fetchUsdPrices(key, signal),
    enabled: key.length > 0 && !!JUPITER_API_KEY,
    staleTime: PRICE_STALE_MS,
    retry: false,
  });
}
