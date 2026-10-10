import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/contexts/WalletContext";

/** Lamports to rent-exempt accounts of the given sizes, summed. Null while loading. */
export function useRentCost(spaces: number[]): number | null {
  const { rpc } = useWallet();
  const { data } = useQuery({
    queryKey: ["rent-exemption", spaces],
    queryFn: async () => {
      // One lookup per distinct size: an estate with many tokens repeats the same two sizes.
      const distinct = [...new Set(spaces)];
      const rentBySpace = new Map(
        await Promise.all(
          distinct.map(
            async (space) =>
              [space, await rpc.getMinimumBalanceForRentExemption(BigInt(space)).send()] as const,
          ),
        ),
      );
      return spaces.reduce((sum, space) => sum + Number(rentBySpace.get(space)), 0);
    },
    staleTime: Infinity,
    enabled: spaces.length > 0,
  });
  return data ?? null;
}
