export type StrategyType = "lulo" | "staking";

export type LuloStrategy = {
  type: "lulo";
  active: boolean;
  mint: string;
  amount: number; // ui units
  decimals: number;
  protected: boolean;
  apy: number;
};

export type StakingStrategy = {
  type: "staking";
  active: boolean;
  amount: number; // ui units (SOL)
  validatorName: string;
  apy: number;
};

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

// ---------------------------------------------------------------------------
// InlineTokenYield
// ---------------------------------------------------------------------------

export type InlineTokenYieldProps = {
  mint: string;
  symbol: string;
  decimals: number;
  vaultBalance: number; // ui units
  strategy: Strategy | null;
  onEnable: () => void;
  onRecall: () => void;
  loading?: boolean;
  progressStep?: StrategyProgressStep;
};

// ---------------------------------------------------------------------------
// SolStakingIndicator
// ---------------------------------------------------------------------------

export type SolStakingIndicatorProps = {
  solBalance: number; // ui units (lamports / 1e9)
  strategy: Strategy | null;
  onEnable: () => void;
  onRecall: () => void;
  loading?: boolean;
  progressStep?: StrategyProgressStep;
};

// ---------------------------------------------------------------------------
// LuloEnableDialog
// ---------------------------------------------------------------------------

export type LuloEnableDialogProps = {
  open: boolean;
  tokenSymbol: string;
  tokenMint: string;
  vaultBalance: number;
  onConfirm: (opts: { protected: boolean }) => void;
  onCancel: () => void;
  loading?: boolean;
};

// ---------------------------------------------------------------------------
// StakingEnableDialog
// ---------------------------------------------------------------------------

export type ValidatorOption = {
  id: string;
  name: string;
  apy: number;
  commission: number; // percent
  icon: React.ReactNode;
  accent: string;
};

export type StakingEnableDialogProps = {
  open: boolean;
  solBalance: number;
  onConfirm: (validatorId: string) => void;
  onCancel: () => void;
  loading?: boolean;
};

// ---------------------------------------------------------------------------
// StrategyProgressOverlay
// ---------------------------------------------------------------------------

export type StrategyProgressOverlayProps = {
  open: boolean;
  strategyType: "lulo" | "staking";
  step: StrategyProgressStep;
  title?: string;
};

// ---------------------------------------------------------------------------
// RecallConfirmDialog
// ---------------------------------------------------------------------------

export type RecallConfirmDialogProps = {
  open: boolean;
  strategyType: "lulo" | "staking";
  tokenSymbol?: string;
  routedAmount: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

// ---------------------------------------------------------------------------
// PreflightRecallDialog
// ---------------------------------------------------------------------------

export type PreflightRecallDialogProps = {
  open: boolean;
  strategies: Strategy[];
  actionName: string; // "Claim" or "Emergency Withdraw"
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

// ---------------------------------------------------------------------------
// TopUpDialog
// ---------------------------------------------------------------------------

export type TopUpDialogProps = {
  open: boolean;
  symbol: string;
  decimals: number;
  vaultBalance: number; // ui units
  walletBalance: number; // ui units
  onConfirm: (amount: number) => void;
  onCancel: () => void;
  loading?: boolean;
};
