import type { Step } from "react-joyride";
import type { TFunction } from "@heirloom/i18n";

export interface BuildTourArgs {
  isConnected: boolean;
  hasEstates: boolean;
  t: TFunction;
}

/** A tour step that also records which route it belongs to, so the tour can auto-navigate. */
export type TourStep = Step & { data: { route: string; vaultStep?: number } };

/**
 * Builds the ordered, state-aware tour. Steps anchor only to elements that
 * actually render — no mock data is injected. Wallet-gated pages (Claim,
 * Heartbeat) use centered, describe-only steps so they work in any connect state.
 */
export function buildTourSteps({ isConnected, hasEstates, t }: BuildTourArgs): TourStep[] {
  const steps: TourStep[] = [];

  // 1. Welcome. Centred on whatever page the tour opens on — the marketing
  // landing is a different origin now, so the dashboard is where a visitor
  // arriving from it lands.
  steps.push({
    target: "body",
    placement: "center",
    title: t("dashboard.tour.step1Title"),
    content: t("dashboard.tour.step1Content"),
    data: { route: "/dashboard" },
  });

  // 2. Create Vault wizard — four sub-steps, each spotlighted in order.
  steps.push({
    target: '[data-tour="create-vault-heirs"]',
    placement: "auto",
    title: t("dashboard.tour.step2Title"),
    content: t("dashboard.tour.step2Content"),
    data: { route: "/create-vault", vaultStep: 0 },
  });
  steps.push({
    target: '[data-tour="create-vault-assets"]',
    placement: "auto",
    title: t("dashboard.tour.step3Title"),
    content: t("dashboard.tour.step3Content"),
    data: { route: "/create-vault", vaultStep: 1 },
  });
  steps.push({
    target: '[data-tour="create-vault-heartbeat"]',
    placement: "auto",
    title: t("dashboard.tour.step4Title"),
    content: t("dashboard.tour.step4Content"),
    data: { route: "/create-vault", vaultStep: 2 },
  });
  steps.push({
    target: '[data-tour="create-vault-review"]',
    placement: "auto",
    title: t("dashboard.tour.step5Title"),
    content: t("dashboard.tour.step5Content"),
    data: { route: "/create-vault", vaultStep: 3 },
  });

  // 3. Dashboard — state-aware.
  if (isConnected && hasEstates) {
    steps.push({
      target: '[data-tour="dashboard-estate"]',
      placement: "top",
      title: t("dashboard.tour.step6Title"),
      content: t("dashboard.tour.step6Content"),
      data: { route: "/dashboard" },
    });
  } else {
    steps.push({
      target: '[data-tour="dashboard-actions"]',
      placement: "auto",
      title: t("dashboard.tour.step7Title"),
      content: t("dashboard.tour.step7Content"),
      data: { route: "/dashboard" },
    });
  }

  // 4. Claim — spotlight the connect-to-find-inheritance panel.
  steps.push({
    target: '[data-tour="claim-connect"]',
    placement: "auto",
    title: t("dashboard.tour.step8Title"),
    content: t("dashboard.tour.step8Content"),
    data: { route: "/claim" },
  });

  // 4b. Claim — manual lookup fallback.
  steps.push({
    target: '[data-tour="claim-manual"]',
    placement: "top",
    title: t("dashboard.tour.step9Title"),
    content: t("dashboard.tour.step9Content"),
    data: { route: "/claim" },
  });

  // 5. Heartbeat — spotlight the lookup panel.
  steps.push({
    target: '[data-tour="heartbeat-lookup"]',
    placement: "auto",
    title: t("dashboard.tour.step10Title"),
    content: t("dashboard.tour.step10Content"),
    data: { route: "/heartbeat" },
  });

  // 6. Finish — clicking Finish prompts the user to connect their wallet.
  steps.push({
    target: "body",
    placement: "center",
    title: t("dashboard.tour.step11Title"),
    content: t("dashboard.tour.step11Content"),
    data: { route: "/create-vault" },
  });

  return steps;
}