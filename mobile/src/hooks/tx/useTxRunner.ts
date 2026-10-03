import { useRef, useState } from "react";

/**
 * One wallet action at a time. `working` names the action in flight so the
 * button that started it can say "Confirm in wallet…" while the rest disable.
 * Failures go to `onFail`; the action resolves to undefined.
 */
export function useTxRunner(onFail: (title: string, cause: unknown) => void) {
  const [working, setWorking] = useState<string | undefined>(undefined);
  const inFlight = useRef(false);

  async function run<T>(key: string, title: string, work: () => Promise<T>): Promise<T | undefined> {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setWorking(key);
    try {
      return await work();
    } catch (cause) {
      onFail(title, cause);
      return undefined;
    } finally {
      inFlight.current = false;
      setWorking(undefined);
    }
  }

  return { busy: working !== undefined, working, run };
}
