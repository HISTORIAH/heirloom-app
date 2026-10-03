import { useEffect, useState } from "react";

/** Re-render every `ms` so countdowns stay live. Returns the current time in ms. */
export function useTick(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
