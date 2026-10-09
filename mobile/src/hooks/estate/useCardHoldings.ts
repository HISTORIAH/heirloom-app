import { useQuery } from "@tanstack/react-query";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import type { Address } from "@solana/kit";

import { fetchCardHoldings } from "@/lib/estate/cardHoldings";
import type { CardHolding } from "@/types/claim";

export function useCardHoldings(owner: Address | undefined) {
  const { client } = useMobileWallet();
  const query = useQuery({
    queryKey: ["card-holdings", owner],
    queryFn: ({ signal }) => {
      if (owner === undefined) throw new Error("No card");
      return fetchCardHoldings(client.rpc, owner, signal);
    },
    enabled: owner !== undefined,
  });

  const holdings: CardHolding[] = query.data?.holdings ?? [];
  return {
    holdings,
    solLamports: query.data?.solLamports ?? 0n,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : undefined,
    refetch: query.refetch,
  };
}
