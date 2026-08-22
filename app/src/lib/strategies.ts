// ---------------------------------------------------------------------------
// Strategy runtime helpers
//
// Types are in types/strategy-ui.ts.
// For the canonical token registry, see lib/yieldTokens.ts.
// For the devnet test mint, see lib/constants.ts (TEMP_DEVNET_LULO_TEST_MINT).
// ---------------------------------------------------------------------------

import {
  type StrategyType,
  type StrategyProgressStep,
  type LuloStrategy,
  type StakingStrategy,
} from "@/types/strategy-ui";

type Translate = (key: string) => string;

export function getProgressMessage(
  step: StrategyProgressStep,
  strategy: StrategyType,
  t: Translate,
): string {
  switch (step) {
    case "withdrawing":
      return t("yield.progressWithdrawing");
    case "depositing":
      return strategy === "lulo" ? t("yield.progressDepositLulo") : t("yield.progressDelegate");
    case "recalling":
      return strategy === "lulo" ? t("yield.progressRecallLulo") : t("yield.progressUndelegate");
    case "returning":
      return t("yield.progressReturning");
    case "complete":
      return t("yield.progressDone");
    case "error":
      return t("yield.progressError");
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Placeholder generators — TEMP: remove when backend integration is live
// ---------------------------------------------------------------------------

export function makePlaceholderLuloStrategy(
  mint: string,
  decimals: number,
  opts?: { protected?: boolean; amount?: number; apy?: number },
): LuloStrategy {
  return {
    type: "lulo",
    active: true,
    mint,
    amount: opts?.amount ?? 1000,
    decimals,
    protected: opts?.protected ?? false,
    apy: opts?.apy ?? 8.5,
  };
}

export function makePlaceholderStakingStrategy(
  opts?: { amount?: number; validatorName?: string; apy?: number },
): StakingStrategy {
  return {
    type: "staking",
    active: true,
    amount: opts?.amount ?? 5.2,
    validatorName: opts?.validatorName ?? "Jito",
    apy: opts?.apy ?? 6.2,
  };
}
