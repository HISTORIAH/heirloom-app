import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "@solana/kit";
import { useWallet } from "@/contexts/WalletContext";
import {
  scanEstateSnapshots,
  type EstateSnapshot,
  type HeirloomClient,
} from "@/services/heirloom";
import type { EstateRole } from "@/types/estate";

const estateKey = (e: EstateSnapshot) => `${e.authority}:${e.heir}`;

/**
 * Every estate that names the connected wallet in `role`, plus any the page looked up by
 * address. Idle until a wallet is connected. Remount per wallet (key on the address) so
 * estates added for one wallet don't carry over to the next.
 */
export function useEstateScan(role: EstateRole, wallet: Address | null) {
  const { rpc, rpcSubscriptions, transactionVersion } = useWallet();
  const client: HeirloomClient = useMemo(
    () => ({ rpc, rpcSubscriptions, transactionVersion }),
    [rpc, rpcSubscriptions, transactionVersion],
  );

  const query = useQuery({
    queryKey: ["estate-scan", role, wallet],
    queryFn: () => scanEstateSnapshots(client, role, wallet as Address),
    enabled: wallet !== null,
    // A scan is a getProgramAccounts call; don't repeat it every time the tab regains focus.
    refetchOnWindowFocus: false,
  });

  // Looked up by hand, or refreshed after a transaction. These win over the scan's copy.
  const [added, setAdded] = useState<EstateSnapshot[]>([]);

  const estates = useMemo(() => {
    const byKey = new Map<string, EstateSnapshot>();
    for (const e of query.data ?? []) byKey.set(estateKey(e), e);
    for (const e of added) byKey.set(estateKey(e), e);
    return Array.from(byKey.values());
  }, [query.data, added]);

  const add = useCallback((estate: EstateSnapshot) => {
    setAdded((prev) => [...prev.filter((e) => estateKey(e) !== estateKey(estate)), estate]);
  }, []);

  return {
    client,
    estates,
    add,
    scanning: query.isLoading,
    failed: query.isError,
    done: query.isSuccess || query.isError,
    refetch: query.refetch,
  };
}
