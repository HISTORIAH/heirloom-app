import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMobileWallet } from "@wallet-ui/react-native-kit";

import { fetchEstateByAddress, fetchEstatesByHeir } from "@/lib/estate/fetch";
import { bySoonest } from "@/lib/estate/summary";
import { parseAddress } from "@/lib/solana/address";
import { errorMessage } from "@/lib/text";
import type { EstateRow } from "@/types/program";

/** Which estate a heir-facing screen is about: one by address, or the soonest naming `heir`. */
export type HeirEstateTarget = { estate?: string; heir?: string };

function heirEstateKey(target: HeirEstateTarget) {
  return ["heir-estate", target.estate ?? null, target.heir ?? null] as const;
}

/**
 * The estate behind the claim and card screens. Raw route params go in and are parsed in the
 * fetch, so a bad address surfaces as the query's error. Always refetched on mount: whether it
 * is claimable matters more than saving a call. `row` is null when there is no such estate.
 */
export function useHeirEstate(target: HeirEstateTarget) {
  const { client } = useMobileWallet();
  const queryClient = useQueryClient();
  const queryKey = heirEstateKey(target);
  const hasTarget = target.estate !== undefined || target.heir !== undefined;

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<EstateRow | null> => {
      if (target.estate !== undefined) {
        return (await fetchEstateByAddress(client.rpc, parseAddress(target.estate, "estate"))) ?? null;
      }
      if (target.heir !== undefined) {
        const rows = await fetchEstatesByHeir(client.rpc, parseAddress(target.heir, "credential"));
        return bySoonest(rows)[0] ?? null;
      }
      return null;
    },
    enabled: hasTarget,
    staleTime: 0,
  });

  /** The row as the cache holds it right now. Retries built in an earlier render read this. */
  function latest(): EstateRow | undefined {
    return queryClient.getQueryData<EstateRow | null>(queryKey) ?? undefined;
  }

  return {
    row: query.data ?? null,
    loading: hasTarget && query.isPending,
    error: query.isError ? errorMessage(query.error, "Could not load") : undefined,
    refetch: query.refetch,
    latest,
  };
}
