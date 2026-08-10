import type { Step } from "react-joyride";

export interface BuildTourArgs {
  isConnected: boolean;
  hasEstates: boolean;
}

/** A tour step that also records which route it belongs to, so the tour can auto-navigate. */
export type TourStep = Step & { data: { route: string; vaultStep?: number } };

/**
 * Builds the ordered, state-aware tour. Steps anchor only to elements that
 * actually render — no mock data is injected. Wallet-gated pages (Claim,
 * Heartbeat) use centered, describe-only steps so they work in any connect state.
 */
export function buildTourSteps({ isConnected, hasEstates }: BuildTourArgs): TourStep[] {
  const steps: TourStep[] = [];

  // 1. Welcome — landing page.
  steps.push({
    target: "body",
    placement: "center",
    title: "Welcome to Heirloom",
    content:
      "Take a quick tour of the app — no wallet needed yet. You only connect when you're ready to move assets.",
    data: { route: "/" },
  });

  // 2. Create Vault wizard — four sub-steps, each spotlighted in order.
  steps.push({
    target: '[data-tour="create-vault-heirs"]',
    placement: "auto",
    title: "Name your heir",
    content:
      "Set who inherits: enter their Solana address, give the relationship a label, and optionally assign a delegate or a heartbeat signer.",
    data: { route: "/create-vault", vaultStep: 0 },
  });
  steps.push({
    target: '[data-tour="create-vault-assets"]',
    placement: "auto",
    title: "Choose your assets",
    content:
      "Deposit SOL and/or SPL tokens into the vault. You can skip this now and add assets later.",
    data: { route: "/create-vault", vaultStep: 1 },
  });
  steps.push({
    target: '[data-tour="create-vault-heartbeat"]',
    placement: "auto",
    title: "Set your check-in timer",
    content:
      "Pick how often you'll confirm you're active, and the grace period heirs wait after you miss a check-in before they can claim.",
    data: { route: "/create-vault", vaultStep: 2 },
  });
  steps.push({
    target: '[data-tour="create-vault-review"]',
    placement: "auto",
    title: "Review & create",
    content:
      "Check the full plan — heir, assets, timers — then acknowledge and hit Create Estate. This is where you connect your wallet to deposit and sign.",
    data: { route: "/create-vault", vaultStep: 3 },
  });

  // 3. Dashboard — state-aware.
  if (isConnected && hasEstates) {
    steps.push({
      target: '[data-tour="dashboard-estate"]',
      placement: "top",
      title: "Your vault dashboard",
      content:
        "Each vault shows its live status, countdown, locked balances and heir. Send a heartbeat here to reset the timer and keep assets with you.",
      data: { route: "/dashboard" },
    });
  } else {
    steps.push({
      target: '[data-tour="dashboard-actions"]',
      placement: "auto",
      title: "Your dashboard",
      content:
        "Before any vault exists, the dashboard lets you create a new estate or — if you were named an heir — claim an inheritance.",
      data: { route: "/dashboard" },
    });
  }

  // 4. Claim — spotlight the connect-to-find-inheritance panel.
  steps.push({
    target: '[data-tour="claim-connect"]',
    placement: "auto",
    title: "Claim an inheritance",
    content:
      "Heirs come here to look up and claim assets left to them. You'll connect a wallet to claim what's yours.",
    data: { route: "/claim" },
  });

  // 4b. Claim — manual lookup fallback.
  steps.push({
    target: '[data-tour="claim-manual"]',
    placement: "top",
    title: "Look up by owner",
    content:
      "If the automatic scan can't find your inheritance, expand this to look up an estate by the vault owner's address.",
    data: { route: "/claim" },
  });

  // 5. Heartbeat — spotlight the lookup panel.
  steps.push({
    target: '[data-tour="heartbeat-lookup"]',
    placement: "auto",
    title: "Heartbeat signer portal",
    content:
      "A trusted signer can refresh a vault's heartbeat here — keeping it active without holding full authority over your assets.",
    data: { route: "/heartbeat" },
  });

  // 6. Finish — clicking Finish prompts the user to connect their wallet.
  steps.push({
    target: "body",
    placement: "center",
    title: "That's Heirloom",
    content:
      "That's the whole app. Click Finish and connect your wallet to create your first vault.",
    data: { route: "/create-vault" },
  });

  return steps;
}
