import { useQuery } from "@tanstack/react-query";
import { useMobileWallet } from "@wallet-ui/react-native-kit";

/** Lamports a plain wallet must keep to stay rent-exempt. Fixed for the session; 0 until loaded. */
export function useRentExemptMin(): bigint {
  const { client } = useMobileWallet();
  const query = useQuery({
    queryKey: ["rent-exempt-min", 0],
    queryFn: async () => BigInt(await client.rpc.getMinimumBalanceForRentExemption(0n).send()),
    staleTime: Infinity,
  });
  return query.data ?? 0n;
}
