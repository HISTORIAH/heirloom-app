import type { Estate } from "@historiah/heirloom";

import { useEstateSpan } from "@/hooks/estate/useEstateSpan";
import type { DashboardView } from "@/types/estate";

/** Estate data shaped for the hero card: span fields plus the one countdown to show. */
export function useDashboardView(data: Estate, claimableLamports: bigint): DashboardView {
  const span = useEstateSpan(data, claimableLamports);
  const days =
    span.state === "active"
      ? span.daysUntilCheckIn
      : span.state === "grace"
        ? span.daysUntilClaim
        : span.state === "claimable"
          ? span.daysOpen
          : 0;
  return {
    state: span.state,
    slab: span.slab,
    days,
    intervalDays: span.intervalDays,
    graceDays: span.graceDays,
    elapsedDays: span.elapsedDays,
  };
}
