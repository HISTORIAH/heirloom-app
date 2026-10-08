import type { Estate } from "@historiah/heirloom";

import { useEstateSpan } from "@/hooks/estate/useEstateSpan";
import { countdownFromSeconds } from "@/lib/estate/countdown";
import type { DashboardView } from "@/types/estate";

/** Estate data shaped for the hero card: span fields plus the one countdown to show. */
export function useDashboardView(data: Estate, claimableLamports: bigint): DashboardView {
  const span = useEstateSpan(data, claimableLamports);
  const countdown =
    span.state === "claimable"
      ? { value: span.daysOpen, unit: "days" as const }
      : countdownFromSeconds(span.remainingSecs);
  return {
    state: span.state,
    slab: span.slab,
    countdown,
    intervalDays: span.intervalDays,
    graceDays: span.graceDays,
    elapsedDays: span.elapsedDays,
  };
}
