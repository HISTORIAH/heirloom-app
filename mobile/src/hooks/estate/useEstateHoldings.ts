import { useQuery, type QueryClient } from "@tanstack/react-query";
import type { Address } from "@solana/kit";
import { useMobileWallet } from "@wallet-ui/react-native-kit";

import { SOL_ASSET_ID } from "@/constants/create";
import { SOL_DECIMALS, SOL_LOGO_URL } from "@/constants/solana";
import { fetchVaultHoldings } from "@/lib/estate/holdings";
import { compareAssets } from "@/lib/estate/topUp";
import type { EstateHolding } from "@/types/estate";
import type { EstateRow, VaultToken } from "@/types/program";
import { failureLine } from "@/lib/failure";

type VaultHoldings = Awaited<ReturnType<typeof fetchVaultHoldings>>;

export function estateHoldingsKey(estate: string | undefined) {
  return ["estate-holdings", estate] as const;
}

function vaultTokensOf(data: VaultHoldings | undefined): VaultToken[] | undefined {
  return data?.tokens.flatMap((h) => (h.vaultToken === undefined ? [] : [h.vaultToken]));
}

/**
 * The vault tokens the holdings query last loaded for `estate`, or undefined if it hasn't.
 * Close, reassign and claim read this when they run, so a retry after a refetch sees fresh tokens.
 */
export function loadedVaultTokens(queryClient: QueryClient, estate: Address): VaultToken[] | undefined {
  return vaultTokensOf(queryClient.getQueryData<VaultHoldings>(estateHoldingsKey(estate)));
}

/**
 * What an estate holds: SOL from the row, tokens and prices fetched. `totalUsd` sums priced rows.
 * Takes `undefined` while the estate itself is still loading.
 */
export function useEstateHoldings(row: EstateRow | undefined) {
  const { client } = useMobileWallet();
  const query = useQuery({
    queryKey: estateHoldingsKey(row?.address),
    queryFn: ({ signal }) => {
      if (row === undefined) throw new Error("No estate");
      return fetchVaultHoldings(client.rpc, row, signal);
    },
    enabled: row !== undefined,
  });

  if (row === undefined) {
    return {
      holdings: [],
      totalUsd: null,
      loading: true,
      error: undefined,
      refetch: query.refetch,
    };
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
    error: query.isError ? failureLine(query.error, "Loading assets") : undefined,
    refetch: query.refetch,
  };
}
