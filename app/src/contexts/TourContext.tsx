import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface TourState {
  /** A tour session is ongoing (independent of the Joyride run flag). */
  active: boolean;
  /** Joyride run prop — toggled off briefly while navigating between routes. */
  run: boolean;
  stepIndex: number;
  setRun: (run: boolean) => void;
  setStepIndex: (index: number) => void;
  /** Begin (or replay) the tour from the first step. */
  start: () => void;
  /** End the tour. */
  stop: () => void;
}

const TourContext = createContext<TourState | null>(null);

export const TourProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [active, setActive] = useState(false);
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
    setRun(true);
  }, []);

  const stop = useCallback(() => {
    setActive(false);
    setRun(false);
    setStepIndex(0);
  }, []);

  const value = useMemo<TourState>(
    () => ({ active, run, stepIndex, setRun, setStepIndex, start, stop }),
    [active, run, stepIndex, start, stop],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
};
