import { useEffect, useState } from "react";

import { LOAD_SLOW_MS } from "@/constants/ui";

/** True once `loading` has been on for `ms` without finishing. Resets when it stops. */
export function useSlowLoad(loading: boolean, ms = LOAD_SLOW_MS): boolean {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const id = setTimeout(() => setExpired(true), ms);
    return () => {
      clearTimeout(id);
      setExpired(false);
    };
  }, [loading, ms]);
  return loading && expired;
}
