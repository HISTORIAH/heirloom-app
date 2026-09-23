import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "@solana/kit";
import { useWallet } from "@/contexts/WalletContext";
import { fetchCatalog, type CatalogEntry } from "@/services/catalog";
import { loadNamedPlans, loadOwnerOverview } from "@/services/overview";

/** Every query this app makes sits under this key, so one invalidation refreshes all of it. */
export const STOCKS_QUERY_KEY = "stocks";

/** Seconds since the epoch, ticking so countdowns and phases stay current. */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** The shipped issuer catalog, keyed by mint. Empty while loading or if it failed. */
export function useCatalog() {
  const query = useQuery({
    queryKey: [STOCKS_QUERY_KEY, "catalog"],
    queryFn: () => fetchCatalog(),
    staleTime: Infinity,
  });
  const entries = useMemo(() => query.data?.entries ?? [], [query.data]);
  const byMint = useMemo(
    () => new Map<Address, CatalogEntry>(entries.map((e) => [e.mint, e])),
    [entries],
  );
  return {
    entries,
    byMint,
    count: entries.length,
    generatedAt: query.data?.generatedAt ?? "",
    isLoading: query.isLoading,
  };
}

/**
 * The connected owner's holdings and plans. Waits for the catalog, which only
 * adds logos and underlying tickers, so rows don't render twice. A null owner
 * reads nothing, for pages that only want this some of the time.
 */
export function useOwnerOverview(owner: Address | null) {
  const { rpc } = useWallet();
  const catalog = useCatalog();
  return useQuery({
    queryKey: [STOCKS_QUERY_KEY, "owner", owner, catalog.count],
    queryFn: () => loadOwnerOverview(rpc, owner!, catalog.byMint),
    enabled: !!owner && !catalog.isLoading,
    refetchInterval: 30_000,
  });
}

/** Plans in which the connected wallet is the destination, guardian, or check-in wallet. */
export function useNamedPlans(wallet: Address) {
  const { rpc } = useWallet();
  const catalog = useCatalog();
  return useQuery({
    queryKey: [STOCKS_QUERY_KEY, "named", wallet, catalog.count],
    queryFn: () => loadNamedPlans(rpc, wallet, catalog.byMint),
    enabled: !catalog.isLoading,
    refetchInterval: 30_000,
  });
}
