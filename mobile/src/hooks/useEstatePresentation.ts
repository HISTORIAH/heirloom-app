import type { Estate } from "@historiah/heirloom";
import { useEffect, useState } from "react";

import { presentEstate, type EstatePresentation } from "@/lib/presentEstate";

export function useEstatePresentation(
  data: Estate,
  claimableLamports: bigint,
): EstatePresentation {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return presentEstate(data, claimableLamports);
}
