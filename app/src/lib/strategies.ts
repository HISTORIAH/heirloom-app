// ---------------------------------------------------------------------------
// Strategy types and runtime state
//
// This file defines the shape of active yield/staking strategies.
// For the canonical token registry, see lib/yieldTokens.ts.
// For the devnet test mint, see lib/tokens.ts.
// ---------------------------------------------------------------------------

export type StrategyType = "lulo" | "staking";

export interface LuloStrategy {
  type: "lulo";
  active: boolean;
  mint: string;
  amount: number; // ui units
  decimals: number;
  protected: boolean;
  apy: number;
}

export interface StakingStrategy {
  type: "staking";
  active: boolean;
  amount: number; // ui units (SOL)
  validatorName: string;
  apy: number;
}

export type Strategy = LuloStrategy | StakingStrategy;

// ---------------------------------------------------------------------------
// Progress state for two-step flows (vault ↔ external protocol)
// ---------------------------------------------------------------------------

export type StrategyProgressStep =
  | "idle"
  | "withdrawing"
  | "depositing"
  | "recalling"
  | "returning"
  | "complete"
  | "error";

export function getProgressMessage(step: StrategyProgressStep, strategy: StrategyType): string {
  switch (step) {
    case "withdrawing":
      return "Confirming withdrawal from vault…";
    case "depositing":
      return strategy === "lulo" ? "Depositing into Lulo…" : "Delegating stake…";
    case "recalling":
      return strategy === "lulo" ? "Withdrawing from Lulo…" : "Undelegating stake…";
    case "returning":
      return "Returning funds to vault…";
    case "complete":
      return "Done!";
    case "error":
      return "Something went wrong.";
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
