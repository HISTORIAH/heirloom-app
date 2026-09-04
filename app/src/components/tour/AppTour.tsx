import { useEffect, useMemo, useState } from "react";
import {
  Joyride,
  ACTIONS,
  EVENTS,
  STATUS,
  type EventHandler,
  type Styles,
} from "react-joyride";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTour } from "@/contexts/TourContext";
import { useWallet } from "@/contexts/WalletContext";
import { useVault } from "@/contexts/VaultContext";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildTourSteps } from "./tourSteps";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { LANDING_URL } from "@/config";
import { useTranslation } from "@heirloom/i18n";

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
    borderRadius: 12,
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
  const { active, run, stepIndex, vaultStep, setRun, setStepIndex, setVaultStep, start, stop } =
    useTour();
  const { isConnected } = useWallet();
  const { estates } = useVault();
  const navigate = useNavigate();
  const location = useLocation();
  const { track } = useAnalytics();
  const { t } = useTranslation("app");

  const [searchParams, setSearchParams] = useSearchParams();

  // The landing's hero CTA used to call start() directly — it was the same
  // bundle. It is a separate site now, so it links here with ?tour=1 and this
  // picks the intent up on arrival. The param is dropped straight away so a
  // reload or a shared URL does not replay the tour.
  useEffect(() => {
    if (searchParams.get("tour") !== "1") return;
    const next = new URLSearchParams(searchParams);
    next.delete("tour");
    setSearchParams(next, { replace: true });
    track("tour_started", { source: "landing" });
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [finishPromptOpen, setFinishPromptOpen] = useState(false);
  const [connectPromptOpen, setConnectPromptOpen] = useState(false);

  const steps = useMemo(
    () => buildTourSteps({ isConnected, hasEstates: estates.length > 0, t }),
    [isConnected, estates.length, t],
  );

  // Completing the tour closes the loop: land on Create Vault and show a prompt
  // inviting the user to connect — its button opens the wallet dialog.
  const completeTour = () => {
    track("tour_completed", { connected: isConnected });
    stop();
    navigate("/create-vault");
    if (!isConnected) setFinishPromptOpen(true);
  };

  // Skipping hands the visitor back to the marketing site they came from.
  // That is a different origin now, so it is a location change, not a route.
  const skipTour = () => {
    track("tour_skipped", { step_index: stepIndex });
    stop();
    window.location.href = LANDING_URL;
  };

  // Advance to a step, navigating first if it lives on another route.
  const goToStep = (nextIndex: number) => {
    const next = steps[nextIndex];
    if (!next) {
      completeTour();
      return;
    }
    const nextVaultStep = next.data.vaultStep ?? null;
    const routeChanged = next.data.route !== location.pathname;
    const vaultChanged = nextVaultStep !== vaultStep;
    setStepIndex(nextIndex);
    setVaultStep(nextVaultStep);
    if (routeChanged) {
      setRun(false); // pause spotlight until the next page mounts
      navigate(next.data.route);
    } else if (vaultChanged) {
      setRun(false); // pause briefly so the wizard step can render
    }
  };

  const handleEvent: EventHandler = (data) => {
    const { action, index, status, type } = data;

    if (status === STATUS.SKIPPED) {
      skipTour();
      return;
    }
    if (status === STATUS.FINISHED) {
      completeTour();
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

  // Once the post-tour wallet connects, send the user to build their vault.
  useEffect(() => {
    if (connectPromptOpen && isConnected) {
      setConnectPromptOpen(false);
      navigate("/create-vault");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectPromptOpen, isConnected]);

  // When a tour becomes active, make sure we're on the first step's route.
  useEffect(() => {
    if (!active) return;
    const first = steps[0];
    if (first && first.data.route !== location.pathname) {
      setRun(false);
      setStepIndex(0);
      setVaultStep(first.data.vaultStep ?? null);
      navigate(first.data.route);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Keep the tour pinned to the top of each page as it moves between routes.
  // (React Router does not reset scroll on navigation, and joyride's own
  // auto-scrolling would otherwise jump the page to the bottom.)
  useEffect(() => {
    if (active) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [active, location.pathname]);

  // Resume the spotlight after a route change or wizard-step change settles.
  useEffect(() => {
    if (active && !run) {
      const t = window.setTimeout(() => setRun(true), 400);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, vaultStep, active, run]);

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        onEvent={handleEvent}
        locale={{
          skip: t("dashboard.tour.skip"),
          next: t("dashboard.tour.next"),
          last: t("dashboard.tour.last"),
          back: t("dashboard.tour.back"),
        }}
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
          skipScroll: true,
        }}
      />
      <Dialog open={finishPromptOpen} onOpenChange={setFinishPromptOpen}>
        <DialogContent className="neo-card-static max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{t("dashboard.tour.allSetTitle")}</DialogTitle>
            <DialogDescription className="font-medium">
              {t("dashboard.tour.allSetDesc")}
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="yellow"
            size="lg"
            className="mt-2 w-full"
            onClick={() => {
              setFinishPromptOpen(false);
              setConnectPromptOpen(true);
            }}
          >
            {t("dashboard.tour.connectWallet")}
          </Button>
        </DialogContent>
      </Dialog>

      <WalletConnectDialog open={connectPromptOpen} onOpenChange={setConnectPromptOpen} />
    </>
  );
};

export default AppTour;
