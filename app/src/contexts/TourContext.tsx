import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const SEEN_KEY = "heirloom_tour_seen";

interface TourState {
  /** A tour session is ongoing (independent of the Joyride run flag). */
  active: boolean;
  /** Joyride run prop — toggled off briefly while navigating between routes. */
  run: boolean;
  stepIndex: number;
  /** True once the user has finished or skipped the tour at least once. */
  seen: boolean;
  setRun: (run: boolean) => void;
  setStepIndex: (index: number) => void;
  /** Begin (or replay) the tour from the first step. */
  start: () => void;
  /** End the tour and mark it as seen. */
  stop: () => void;
}

const TourContext = createContext<TourState | null>(null);

function readSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export const TourProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [active, setActive] = useState(false);
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [seen, setSeen] = useState<boolean>(readSeen);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
    setRun(true);
  }, []);

  const stop = useCallback(() => {
    setActive(false);
    setRun(false);
    setStepIndex(0);
    setSeen(true);
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
  }, []);

  const value = useMemo<TourState>(
    () => ({ active, run, stepIndex, seen, setRun, setStepIndex, start, stop }),
    [active, run, stepIndex, seen, start, stop],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
};
