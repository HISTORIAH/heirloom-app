import { useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/hooks/auth/useSession";
import { deleteEstate } from "@/services/api/estateMetadata";

/**
 * Drops everything the backend kept for an estate once it's closed on-chain. Needs the SIWS
 * session; signs in first if there isn't one. Best-effort: the close already went through,
 * so a failed cleanup is logged rather than surfaced.
 */
export function useDeleteEstateData() {
  const queryClient = useQueryClient();
  const { withSession } = useSession();

  return async function deleteEstateData(estateAddress: string): Promise<void> {
    try {
      await withSession(() => deleteEstate(estateAddress));
      queryClient.removeQueries({ queryKey: ["reminders", estateAddress] });
      void queryClient.invalidateQueries({ queryKey: ["estate-metadata"] });
    } catch (cause) {
      console.warn("estate data cleanup failed", cause);
    }
  };
}
