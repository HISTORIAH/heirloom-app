import { createContext, useContext, useEffect, useState } from "react";

/**
 * What a page keeps while its body changes under it.
 *
 * Every route renders without a wallet, and asks for one only when an action
 * needs a signature. Connecting swaps the page body for its connected
 * version, which would throw away anything typed into it and the action that
 * asked for the wallet in the first place. The session sits above that swap
 * (in `StocksPage`), so a form's draft survives it and the action can carry on
 * once the wallet is there.
 */
export interface PageSession {
  /** Opens the wallet dialog. */
  connect: () => void;
  /**
   * Opens the wallet dialog on behalf of an action. Once a wallet connects,
   * the connected page picks the action up by `key` with `useResume`. If the
   * dialog is dismissed instead, the action is dropped.
   */
  requireWallet: (key: string, payload?: unknown) => void;
  drafts: Map<string, unknown>;
  intents: Map<string, unknown>;
}

export const PageSessionContext = createContext<PageSession | null>(null);

export function usePageSession(): PageSession {
  const session = useContext(PageSessionContext);
  if (!session) throw new Error("usePageSession must be used within a StocksPage");
  return session;
}

/** Opens the wallet dialog. */
export const useConnect = () => usePageSession().connect;

/**
 * `useState` whose value outlives the component: remounted under the same
 * key (as a page body is when a wallet connects), it starts from where it was.
 */
export function useDraft<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const { drafts } = usePageSession();
  const [value, setValue] = useState<T>(() =>
    drafts.has(key) ? (drafts.get(key) as T) : initial,
  );
  useEffect(() => {
    drafts.set(key, value);
  }, [drafts, key, value]);
  return [value, setValue];
}

/**
 * Takes the pending action `key`, once, when `enabled` first holds, and
 * returns its payload (`true` if it had none) — or undefined if nothing was
 * waiting. Taking it removes it, so a StrictMode double effect can't run an
 * action twice.
 */
export function useResume<T = true>(key: string, enabled: boolean): T | undefined {
  const { intents } = usePageSession();
  const [taken, setTaken] = useState<{ value: T } | null>(null);
  useEffect(() => {
    if (!enabled || !intents.has(key)) return;
    const value = intents.get(key) as T;
    intents.delete(key);
    setTaken({ value });
  }, [enabled, intents, key]);
  return taken?.value;
}
