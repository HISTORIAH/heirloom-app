import { useQuery } from "@tanstack/react-query";

import { BACKEND_URL } from "@/config";
import { ESTATE_METADATA_STALE_MS } from "@/constants/api";
import { fetchEstateMetadata } from "@/services/api/estateMetadata";

/**
 * Fetches estate names from the backend, keyed by estate address.
 * Returns an empty record when BACKEND_URL is not configured or the backend is unreachable.
 */
export function useEstateMetadata(estateAddresses: string[]) {
  const sorted = estateAddresses.slice().sort();
  const key = sorted.join(",");

  const query = useQuery({
    queryKey: ["estate-metadata", key],
    queryFn: async (): Promise<Record<string, string>> => {
      const byAddress = await fetchEstateMetadata(sorted);
      const names: Record<string, string> = {};
      for (const [addr, meta] of Object.entries(byAddress)) {
        if (meta.name) names[addr] = meta.name;
      }
      return names;
    },
    enabled: BACKEND_URL !== undefined && sorted.length > 0,
    staleTime: ESTATE_METADATA_STALE_MS,
    retry: 1,
  });

  return {
    names: query.data ?? {},
    loading: query.isPending,
    reload: query.refetch,
  };
}
