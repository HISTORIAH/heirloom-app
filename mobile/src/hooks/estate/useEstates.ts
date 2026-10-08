import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { useEstateMetadata } from "@/hooks/estate/useEstateMetadata";
import { fetchEstatesFor } from "@/lib/estate/fetch";
import { errorMessage } from "@/lib/text";
import type { EstateRole, EstateRow } from "@/types/program";

/**
 * Every estate the connected wallet holds `role` on. Cached per wallet and role, so the screens
 * that list the same estates share one fetch. Focusing a screen refetches only once the cache is
 * stale; `reload` always fetches (pull-to-refresh, after a transaction).
 */
export function useEstates(role: EstateRole) {
  const { account, client } = useMobileWallet();
  const address = account?.address;
  const queryClient = useQueryClient();
  const queryKey = ["estates", role, address ?? ""];

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (address === undefined) throw new Error("No wallet");
      return fetchEstatesFor(role)(client.rpc, address);
    },
    enabled: address !== undefined,
  });
  const rows = address === undefined ? [] : (query.data ?? []);

  const { names, reload: reloadMetadata } = useEstateMetadata(rows.map((r) => String(r.address)));

  const { refetch } = query;
  const reload = useCallback(async (): Promise<EstateRow[]> => {
    if (address === undefined) return [];
    const res = await refetch();
    return res.data ?? [];
  }, [address, refetch]);

  // Staleness is read when focus lands, not as a dependency: otherwise the cache going stale
  // while the screen sits open would re-run this and turn it into a poll.
  useFocusEffect(
    useCallback(() => {
      if (address === undefined) return;
      // cancelRefetch: false joins a fetch already in flight (first mount) instead of restarting it.
      void queryClient.refetchQueries(
        { queryKey: ["estates", role, address], stale: true },
        { cancelRefetch: false },
      );
    }, [address, queryClient, role]),
  );

  function drop(target: string) {
    queryClient.setQueryData<EstateRow[]>(queryKey, (prev) =>
      prev?.filter((row) => row.address !== target),
    );
  }

  // Merge backend names into rows once metadata arrives.
  const labelled = rows.map((row) => {
    const name = names[String(row.address)];
    return name !== undefined ? { ...row, label: name } : row;
  });

  return {
    account,
    rows: labelled,
    loading: query.isLoading,
    error: query.isError ? errorMessage(query.error, "Could not load estates") : null,
    reload,
    drop,
    reloadMetadata,
  };
}
