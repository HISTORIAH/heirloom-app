import { useEffect, useMemo } from "react";
import {
  Joyride,
  ACTIONS,
  EVENTS,
  STATUS,
  type EventHandler,
  type Styles,
} from "react-joyride";
import { useLocation, useNavigate } from "react-router-dom";
import { useTour } from "@/contexts/TourContext";
import { useWallet } from "@/contexts/WalletContext";
import { useVault } from "@/contexts/VaultContext";
import { buildTourSteps } from "./tourSteps";

const BLACK = "hsl(0, 0%, 0%)";
const WHITE = "hsl(0, 0%, 100%)";
const LIME = "hsl(72, 100%, 50%)";

// Neo-brutalist tooltip styling to match the rest of the app.
const neoStyles: Partial<Styles> = {
  tooltip: {
    borderRadius: 0,
    border: `4px solid ${BLACK}`,
    boxShadow: `8px 8px 0 0 ${BLACK}`,
    padding: 24,
    fontFamily: "inherit",
  },
  tooltipTitle: {
    fontWeight: 900,
    fontSize: 22,
    textTransform: "uppercase",
    margin: 0,
    marginBottom: 8,
    textAlign: "left",
  },
  tooltipContent: {
    fontWeight: 500,
    fontSize: 15,
    lineHeight: 1.5,
    textAlign: "left",
    padding: "4px 0 0",
  },
  buttonPrimary: {
    backgroundColor: LIME,
    color: BLACK,
    border: `3px solid ${BLACK}`,
    borderRadius: 0,
    fontWeight: 900,
    textTransform: "uppercase",
    fontSize: 13,
    letterSpacing: "0.05em",
    padding: "10px 18px",
    boxShadow: `3px 3px 0 0 ${BLACK}`,
  },
  buttonSkip: {
    color: BLACK,
    fontWeight: 700,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    textDecoration: "underline",
  },
};

/**
 * Renders the controlled, route-spanning onboarding tour. Must live inside the
 * Router and below the Wallet/Vault providers so it can navigate and read state.
 */
const AppTour = () => {
  const { active, run, stepIndex, setRun, setStepIndex, stop } = useTour();
  const { isConnected } = useWallet();
  const { estates } = useVault();
  const navigate = useNavigate();
  const location = useLocation();

  const steps = useMemo(
    () => buildTourSteps({ isConnected, hasEstates: estates.length > 0 }),
    [isConnected, estates.length],
  );

  const finish = () => {
    stop();
    navigate("/create-vault");
  };

  // Advance to a step, navigating first if it lives on another route.
  const goToStep = (nextIndex: number) => {
    const next = steps[nextIndex];
    if (!next) {
      finish();
      return;
    }
    if (next.data.route !== location.pathname) {
      setRun(false); // pause spotlight until the next page mounts
      setStepIndex(nextIndex);
      navigate(next.data.route);
    } else {
      setStepIndex(nextIndex);
    }
  };

  const handleEvent: EventHandler = (data) => {
    const { action, index, status, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      finish();
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      goToStep(index + (action === ACTIONS.PREV ? -1 : 1));
      return;
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      goToStep(index + 1);
    }
  };

  // When a tour becomes active, make sure we're on the first step's route.
  useEffect(() => {
    if (!active) return;
    const first = steps[0];
    if (first && first.data.route !== location.pathname) {
      setRun(false);
      setStepIndex(0);
      navigate(first.data.route);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Resume the spotlight after a route change settles.
  useEffect(() => {
    if (active && !run) {
      const t = window.setTimeout(() => setRun(true), 400);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, active, run]);

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      onEvent={handleEvent}
      locale={{ skip: "Skip", next: "Next", last: "Finish", back: "Back" }}
      styles={neoStyles}
      options={{
        primaryColor: LIME,
        backgroundColor: WHITE,
        textColor: BLACK,
        arrowColor: WHITE,
        overlayColor: "rgba(0, 0, 0, 0.55)",
        spotlightRadius: 8,
        spotlightPadding: 8,
        zIndex: 10000,
        width: 400,
        skipBeacon: true,
        buttons: ["skip", "primary"],
        overlayClickAction: false,
        targetWaitTimeout: 4000,
      }}
    />
  );
};

export default AppTour;
