import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

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
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!address) {
        setRows([]);
        setLoading(false);
        setError(null);
        return;
      }

      let cancelled = false;
      setLoading(true);
      setError(null);

      fetchForRole(role)(client.rpc, address)
        .then((next) => {
          if (!cancelled) setRows(next);
        })
        .catch((cause: unknown) => {
          if (cancelled) return;
          setRows([]);
          setError(cause instanceof Error ? cause.message : "Could not load estates");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [address, client, role, nonce]),
  );

  return { account, rows, loading, error, reload };
}
