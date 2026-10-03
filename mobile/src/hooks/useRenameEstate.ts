import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateEstate } from "@/services/api/estateMetadata";

type RenameInput = {
  estateAddress: string;
  name: string;
};

export function useRenameEstate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ estateAddress, name }: RenameInput) =>
      updateEstate(estateAddress, { name }),
    onSuccess: (_data, { estateAddress }) => {
      // Invalidate so the next read picks up the new name.
      queryClient.invalidateQueries({ queryKey: ["estate-metadata"] });
    },
  });
}
