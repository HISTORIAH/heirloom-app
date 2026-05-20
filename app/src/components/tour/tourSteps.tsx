import type { Step } from "react-joyride";

export interface BuildTourArgs {
  isConnected: boolean;
  hasEstates: boolean;
}

/** A tour step that also records which route it belongs to, so the tour can auto-navigate. */
export type TourStep = Step & { data: { route: string } };

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

  // 2. Create Vault wizard — fully usable before connecting.
  steps.push({
    target: '[data-tour="create-vault-steps"]',
    placement: "bottom",
    title: "Create a vault",
    content:
      "Build your heartbeat vault in four steps: set your check-in timer, name your heir, choose assets, then review. You can fill all of this in without a wallet — it's only needed at the final 'Create Estate' step to deposit and sign.",
    data: { route: "/create-vault" },
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
      placement: "bottom",
      title: "Your dashboard",
      content:
        "Before any vault exists, the dashboard lets you create a new estate or — if you were named an heir — claim an inheritance.",
      data: { route: "/dashboard" },
    });
  }

  // 4. Claim — wallet-gated, describe only.
  steps.push({
    target: "body",
    placement: "center",
    title: "Claim an inheritance",
    content:
      "Heirs come here to look up and claim assets left to them. You'll connect a wallet to claim what's yours.",
    data: { route: "/claim" },
  });

  // 5. Heartbeat — wallet-gated, describe only.
  steps.push({
    target: "body",
    placement: "center",
    title: "Heartbeat signer portal",
    content:
      "A trusted signer can refresh a vault's heartbeat here — keeping it active without holding full authority over your assets.",
    data: { route: "/heartbeat" },
  });

  // 6. Finish — back on Create Vault, the natural next step.
  steps.push({
    target: "body",
    placement: "center",
    title: "That's Heirloom",
    content:
      "Ready to protect your assets? Start building your vault — you'll only connect your wallet when it's time to deposit.",
    data: { route: "/create-vault" },
  });

  return steps;
}
