import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateEstate } from "@/services/api/estateMetadata";
import type { RenameEstateInput } from "@/types/estate";


export function useRenameEstate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ estateAddress, name }: RenameEstateInput) =>
      updateEstate(estateAddress, { name }),
    onSuccess: () => {
      // Invalidate so the next read picks up the new name.
      queryClient.invalidateQueries({ queryKey: ["estate-metadata"] });
    },
  });
}
