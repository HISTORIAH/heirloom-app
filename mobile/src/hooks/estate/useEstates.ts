import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { useEstateMetadata } from "@/hooks/estate/useEstateMetadata";
import { fetchEstatesFor } from "@/lib/estate/fetch";
import { errorMessage } from "@/lib/text";
import type { EstateRole, EstateRow } from "@/types/program";

export function useEstates(role: EstateRole) {
  const { account, client } = useMobileWallet();
  const address = account?.address;
  const [rows, setRows] = useState<EstateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef(false);

  const { names, reload: reloadMetadata } = useEstateMetadata(rows.map((r) => String(r.address)));

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
      const next = await fetchEstatesFor(role)(client.rpc, address);
      setRows(next);
      setError(null);
      seen.current = true;
      return next;
    } catch (cause: unknown) {
      setRows([]);
      setError(errorMessage(cause, "Could not load estates"));
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

  // Merge backend names into rows once metadata arrives.
  const labelled = rows.map((row) => {
    const name = names[String(row.address)];
    return name !== undefined ? { ...row, label: name } : row;
  });

  return { account, rows: labelled, loading, error, reload, drop, reloadMetadata };
}
