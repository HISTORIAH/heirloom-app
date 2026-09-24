import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import {
  fetchEstatesByAuthority,
  fetchEstatesByDelegate,
  fetchEstatesByHbSigner,
  fetchEstatesByHeir,
  type EstateRow,
} from "@/lib/estates";

export type EstateRole = "authority" | "heir" | "hbSigner" | "delegate";

function fetchForRole(role: EstateRole) {
  if (role === "authority") return fetchEstatesByAuthority;
  if (role === "heir") return fetchEstatesByHeir;
  if (role === "delegate") return fetchEstatesByDelegate;
  return fetchEstatesByHbSigner;
}

export function useEstates(role: EstateRole) {
  const { account, client } = useMobileWallet();
  const address = account?.address;
  const [rows, setRows] = useState<EstateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef(false);

  const reload = useCallback(async (): Promise<EstateRow[]> => {
    if (address === undefined) {
      setRows([]);
      setLoading(false);
      setError(null);
      seen.current = false;
      return [];
    }
    if (!seen.current) setLoading(true);
    try {
      const next = await fetchForRole(role)(client.rpc, address);
      setRows(next);
      setError(null);
      seen.current = true;
      return next;
    } catch (cause: unknown) {
      setRows([]);
      setError(cause instanceof Error ? cause.message : "Could not load estates");
      seen.current = false;
      return [];
    } finally {
      setLoading(false);
    }
  }, [address, client, role]);

  function drop(target: string) {
    setRows((prev) => prev.filter((row) => row.address !== target));
  }

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { account, rows, loading, error, reload, drop };
}
