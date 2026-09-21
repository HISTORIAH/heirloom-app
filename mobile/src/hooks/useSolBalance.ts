import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

export function useSolBalance() {
  const { account, client, connect } = useMobileWallet();
  const address = account?.address;
  const [lamports, setLamports] = useState<bigint | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (address === undefined) {
        setLamports(undefined);
        setLoading(false);
        return;
      }
      let cancelled = false;
      setLoading(true);
      void client.rpc
        .getBalance(address)
        .send()
        .then((res) => {
          if (!cancelled) setLamports(res.value);
        })
        .catch(() => {
          if (!cancelled) setLamports(undefined);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [address, client]),
  );

  return {
    lamports,
    loading,
    connected: address !== undefined,
    connect,
  };
}
