import type { Estate } from "@historiah/heirloom";

import { useTick } from "@/hooks/useTick";
import { estateSpan } from "@/lib/estate/span";
import type { EstateSpan } from "@/types/estate";

/** `estateSpan`, recomputed every second so countdowns move. */
export function useEstateSpan(data: Estate, claimableLamports: bigint): EstateSpan {
  useTick();
  return estateSpan(data, claimableLamports);
}
