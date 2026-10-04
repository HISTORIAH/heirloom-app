import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/hooks/auth/useSession";
import { updateEstate } from "@/services/api/estateMetadata";
import type { RenameEstateInput } from "@/types/estate";

/** Needs the SIWS session; signs in first if there isn't one. */
export function useRenameEstate() {
  const queryClient = useQueryClient();
  const { withSession } = useSession();

  return useMutation({
    mutationFn: ({ estateAddress, name }: RenameEstateInput) =>
      withSession(() => updateEstate(estateAddress, { name })),
    onSuccess: () => {
      // Invalidate so the next read picks up the new name.
      queryClient.invalidateQueries({ queryKey: ["estate-metadata"] });
    },
  });
}
