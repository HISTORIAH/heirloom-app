import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/contexts/WalletContext";

/** Lamports to rent-exempt accounts of the given sizes, summed. Null while loading. */
export function useRentCost(spaces: number[]): number | null {
  const { rpc } = useWallet();
  const { data } = useQuery({
    queryKey: ["rent-exemption", spaces],
    queryFn: async () => {
      const each = await Promise.all(
        spaces.map((space) => rpc.getMinimumBalanceForRentExemption(BigInt(space)).send()),
      );
      return each.reduce((sum, lamports) => sum + Number(lamports), 0);
    },
    staleTime: Infinity,
    enabled: spaces.length > 0,
  });
  return data ?? null;
}
