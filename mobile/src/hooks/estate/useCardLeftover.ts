import { useQuery } from "@tanstack/react-query";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import type { Address } from "@solana/kit";

import { cardHasSweepable } from "@/lib/card/tokens";
import type { Leftover } from "@/types/claim";

/** Whether a credential still holds anything worth sending on. Only asked while `active`. */
export function useCardLeftover(heir: Address | undefined, active: boolean): Leftover {
  const { client } = useMobileWallet();
  const enabled = active && heir !== undefined;
  const query = useQuery({
    queryKey: ["card-leftover", heir],
    queryFn: () => {
      if (heir === undefined) throw new Error("No card");
      return cardHasSweepable(client.rpc, heir);
    },
    enabled,
    staleTime: 0,
  });
  if (!enabled) return "idle";
  if (query.isPending) return "checking";
  // A failed check reads as nothing left, as before: the claim screen still works without it.
  return query.data === true ? "some" : "none";
}
