import type { Estate } from "@historiah/heirloom";
import { useEffect, useState } from "react";

import { estateStatusLine } from "@/lib/estateState";

export function useEstateStatusLine(data: Estate, vaultEmpty: boolean) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return estateStatusLine(data, vaultEmpty);
}
