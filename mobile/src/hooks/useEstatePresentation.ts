import type { Estate } from "@historiah/heirloom";
import { useEffect, useState } from "react";

import { presentDashboard, type DashboardView } from "@/lib/presentDashboard";
import { presentEstate, type EstatePresentation } from "@/lib/presentEstate";

function useTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

export function useEstatePresentation(
  data: Estate,
  claimableLamports: bigint,
): EstatePresentation {
  useTick();
  return presentEstate(data, claimableLamports);
}

export function useDashboardView(
  data: Estate,
  claimableLamports: bigint,
): DashboardView {
  useTick();
  return presentDashboard(data, claimableLamports);
}
