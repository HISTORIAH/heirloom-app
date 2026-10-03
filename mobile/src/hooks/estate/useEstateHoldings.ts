import { useQuery } from "@tanstack/react-query";
import { useMobileWallet } from "@wallet-ui/react-native-kit";

import { SOL_ASSET_ID } from "@/constants/create";
import { SOL_DECIMALS, SOL_LOGO_URL } from "@/constants/solana";
import { fetchVaultHoldings } from "@/lib/estate/holdings";
import { compareAssets } from "@/lib/estate/topUp";
import type { EstateHolding } from "@/types/estate";
import type { EstateRow } from "@/types/program";

/**
 * What an estate holds: SOL from the row, tokens and prices fetched. `totalUsd` sums priced rows.
 * Takes `undefined` while the estate itself is still loading.
 */
export function useEstateHoldings(row: EstateRow | undefined) {
  const { client } = useMobileWallet();
  const query = useQuery({
    queryKey: ["estate-holdings", String(row?.address)],
    queryFn: ({ signal }) => {
      if (row === undefined) throw new Error("No estate");
      return fetchVaultHoldings(client.rpc, row, signal);
    },
    enabled: row !== undefined,
  });

  if (row === undefined) {
    return { holdings: [], totalUsd: null, loading: true, error: undefined, refetch: query.refetch };
  }

  const solUsd = query.data?.solUsd ?? null;
  const sol: EstateHolding = {
    id: SOL_ASSET_ID,
    symbol: "SOL",
    name: "Solana",
    image: SOL_LOGO_URL,
    decimals: SOL_DECIMALS,
    amount: row.claimableLamports,
    usd: solUsd === null ? null : (Number(row.claimableLamports) / 10 ** SOL_DECIMALS) * solUsd,
    named: true,
  };
  const holdings = [sol, ...(query.data?.tokens ?? [])].sort(
    compareAssets<EstateHolding>("value", (item) => item.amount),
  );
  const priced = holdings.filter((h) => h.usd !== null);
  const totalUsd = priced.length === 0 ? null : priced.reduce((sum, h) => sum + (h.usd ?? 0), 0);

  return {
    holdings,
    totalUsd,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : undefined,
    refetch: query.refetch,
  };
}
