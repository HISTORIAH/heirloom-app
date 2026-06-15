import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type Strategy,
  type StrategyType,
  type StrategyProgressStep,
  getProgressMessage,
} from "@/lib/strategies";
import { getYieldConfigByMint } from "@/lib/yieldTokens";
import { formatTokenAmount, cn } from "@/lib/utils";
import {
  Landmark,
  Sprout,
  ShieldCheck,
  ShieldOff,
  Loader2,
  ArrowLeftRight,
  CheckCircle2,
  Zap,
  CircleDollarSign,
  TrendingUp,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// InlineTokenYield — appears on a token row when Lulo is supported
// ---------------------------------------------------------------------------

interface InlineTokenYieldProps {
  mint: string;
  symbol: string;
  decimals: number;
  vaultBalance: number; // ui units
  strategy: Strategy | null;
  onEnable: () => void;
  onRecall: () => void;
  loading?: boolean;
  progressStep?: StrategyProgressStep;
}

export const InlineTokenYield: React.FC<InlineTokenYieldProps> = ({
  mint,
  symbol,
  decimals,
  vaultBalance,
  strategy,
  onEnable,
  onRecall,
  loading = false,
  progressStep = "idle",
}) => {
  const config = getYieldConfigByMint(mint);
  if (!config || !config.luloSupported) return null;

  const isActive = strategy?.active ?? false;
  const isWorking = loading || progressStep !== "idle";

  if (isActive && strategy?.type === "lulo") {
    const lulo = strategy;
    const formatted = formatTokenAmount(
      BigInt(Math.round(lulo.amount * 10 ** decimals)),
      decimals,
    );

    return (
      <div className="mt-3 pt-3 border-t-2 border-dashed border-foreground/10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="neo-badge text-[10px] px-2 py-0.5 bg-accent-lime flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Yielding
            </span>
            <span className="text-xs font-bold text-muted-foreground">
              {formatted} {symbol} @ {lulo.apy.toFixed(1)}% APY
            </span>
            {lulo.protected ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-accent-cyan">
                <ShieldCheck className="h-3 w-3" />
                Protected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-accent-orange">
                <ShieldOff className="h-3 w-3" />
                Unprotected
              </span>
            )}
          </div>
          <button
            onClick={onRecall}
            disabled={isWorking}
            className={cn(
              "text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-colors",
              isWorking ? "opacity-50" : "text-foreground/60 hover:text-foreground",
            )}
          >
            {isWorking ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowLeftRight className="h-3 w-3" />
            )}
            Recall
          </button>
        </div>

        {progressStep !== "idle" && progressStep !== "complete" && (
          <div className="flex items-center gap-2 mt-2">
            <Loader2 className="h-3 w-3 animate-spin text-accent-purple" />
            <p className="text-xs font-bold">{getProgressMessage(progressStep, "lulo")}</p>
          </div>
        )}
        {progressStep === "complete" && (
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle2 className="h-3 w-3 text-accent-lime" />
            <p className="text-xs font-bold">{getProgressMessage("complete", "lulo")}</p>
          </div>
        )}
      </div>
    );
  }

  // Inactive — show enable prompt inline
  return (
    <div className="mt-3 pt-3 border-t-2 border-dashed border-foreground/10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">
            This token is eligible for Lulo yield
          </span>
          <span className="text-[10px] font-bold text-accent-purple">
            Up to {config.apyUnprotected.toFixed(1)}% APY
          </span>
        </div>
        <button
          onClick={onEnable}
          disabled={isWorking || vaultBalance <= 0}
          className={cn(
            "neo-border rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-colors flex items-center gap-1 shrink-0",
            isWorking || vaultBalance <= 0
              ? "bg-secondary opacity-50"
              : "bg-accent-purple text-primary-foreground hover:bg-accent-purple/90",
          )}
        >
          {isWorking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <TrendingUp className="h-3 w-3" />
          )}
          Earn Yield
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SolStakingIndicator — appears below SOL balance in stats grid
// ---------------------------------------------------------------------------

interface SolStakingIndicatorProps {
  solBalance: number; // ui units (lamports / 1e9)
  strategy: Strategy | null;
  onEnable: () => void;
  onRecall: () => void;
  loading?: boolean;
  progressStep?: StrategyProgressStep;
}

export const SolStakingIndicator: React.FC<SolStakingIndicatorProps> = ({
  solBalance,
  strategy,
  onEnable,
  onRecall,
  loading = false,
  progressStep = "idle",
}) => {
  const isActive = strategy?.active ?? false;
  const isWorking = loading || progressStep !== "idle";

  if (isActive && strategy?.type === "staking") {
    const staked = strategy;
    return (
      <div className="mt-4 pt-4 border-t-2 border-foreground/10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="neo-badge text-[10px] px-2 py-0.5 bg-accent-lime flex items-center gap-1">
              <Sprout className="h-3 w-3" />
              Staked
            </span>
            <span className="text-sm font-bold text-muted-foreground">
              {staked.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL
            </span>
            <span className="text-xs font-bold text-accent-lime">
              {staked.apy.toFixed(1)}% APY
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
              <CircleDollarSign className="h-3 w-3" />
              {staked.validatorName}
            </span>
          </div>
          <button
            onClick={onRecall}
            disabled={isWorking}
            className={cn(
              "text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-colors",
              isWorking ? "opacity-50" : "text-foreground/60 hover:text-foreground",
            )}
          >
            {isWorking ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowLeftRight className="h-3 w-3" />
            )}
            Unstake
          </button>
        </div>

        {progressStep !== "idle" && progressStep !== "complete" && (
          <div className="flex items-center gap-2 mt-2">
            <Loader2 className="h-3 w-3 animate-spin text-accent-lime" />
            <p className="text-xs font-bold">{getProgressMessage(progressStep, "staking")}</p>
          </div>
        )}
        {progressStep === "complete" && (
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle2 className="h-3 w-3 text-accent-lime" />
            <p className="text-xs font-bold">{getProgressMessage("complete", "staking")}</p>
          </div>
        )}
      </div>
    );
  }

  // Inactive
  return (
    <div className="mt-4 pt-4 border-t-2 border-foreground/10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs font-bold text-muted-foreground">
          Stake SOL to earn ~6.2% APY
        </span>
        <button
          onClick={onEnable}
          disabled={isWorking || solBalance <= 0}
          className={cn(
            "neo-border rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-colors flex items-center gap-1 shrink-0",
            isWorking || solBalance <= 0
              ? "bg-secondary opacity-50"
              : "bg-accent-lime hover:bg-accent-lime/90",
          )}
        >
          {isWorking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sprout className="h-3 w-3" />
          )}
          Stake SOL
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// LuloEnableDialog — protected vs unprotected choice (unchanged UX, tighter)
// ---------------------------------------------------------------------------

interface LuloEnableDialogProps {
  open: boolean;
  tokenSymbol: string;
  tokenMint: string;
  vaultBalance: number;
  onConfirm: (opts: { protected: boolean }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const LuloEnableDialog: React.FC<LuloEnableDialogProps> = ({
  open,
  tokenSymbol,
  tokenMint,
  vaultBalance,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [selectedMode, setSelectedMode] = useState<"protected" | "unprotected">("protected");
  const config = getYieldConfigByMint(tokenMint);

  if (!open || !config) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-6"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        className="neo-card-static max-w-lg w-full neo-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-accent-purple neo-border rounded-xl p-3 shrink-0">
              <Landmark className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black leading-tight">Enable Lulo Yield</h3>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                Route {vaultBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
                {tokenSymbol} from your vault to Lulo.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="neo-border rounded-lg p-2 bg-secondary hover:bg-secondary/70 transition-colors shrink-0 disabled:opacity-50"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Choose deposit type
          </p>

          <button
            onClick={() => setSelectedMode("protected")}
            disabled={loading}
            className={cn(
              "w-full text-left neo-border rounded-xl p-4 transition-all duration-150",
              selectedMode === "protected"
                ? "bg-accent-cyan/10 border-foreground shadow-[4px_4px_0px_0px_hsl(var(--foreground))]"
                : "bg-secondary hover:bg-secondary/70",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "neo-border rounded-lg p-2 shrink-0",
                  selectedMode === "protected" ? "bg-accent-cyan" : "bg-secondary",
                )}
              >
                <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black">Protected</span>
                  <span className="neo-badge text-[10px] px-2 py-0.5 bg-accent-cyan">Recommended</span>
                </div>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  Funds are insured against platform risk. Lower yield, higher safety.
                </p>
                <p className="text-sm font-black mt-1">{config.apyProtected.toFixed(1)}% APY</p>
              </div>
              {selectedMode === "protected" && (
                <div className="w-4 h-4 rounded-full bg-accent-cyan neo-border shrink-0" />
              )}
            </div>
          </button>

          <button
            onClick={() => setSelectedMode("unprotected")}
            disabled={loading}
            className={cn(
              "w-full text-left neo-border rounded-xl p-4 transition-all duration-150",
              selectedMode === "unprotected"
                ? "bg-accent-orange/10 border-foreground shadow-[4px_4px_0px_0px_hsl(var(--foreground))]"
                : "bg-secondary hover:bg-secondary/70",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "neo-border rounded-lg p-2 shrink-0",
                  selectedMode === "unprotected" ? "bg-accent-orange" : "bg-secondary",
                )}
              >
                <ShieldOff className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-black">Unprotected</span>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  Higher yield with no insurance. Best for risk-tolerant deposits.
                </p>
                <p className="text-sm font-black mt-1">{config.apyUnprotected.toFixed(1)}% APY</p>
              </div>
              {selectedMode === "unprotected" && (
                <div className="w-4 h-4 rounded-full bg-accent-orange neo-border shrink-0" />
              )}
            </div>
          </button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t-2 border-foreground/10">
          <Button variant="outline" size="default" onClick={onCancel} disabled={loading} className="sm:w-auto w-full">
            Cancel
          </Button>
          <Button
            variant="purple"
            size="default"
            onClick={() => onConfirm({ protected: selectedMode === "protected" })}
            disabled={loading}
            className="sm:w-auto w-full"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</>
            ) : (
              <><Zap className="h-4 w-4" /> Route to Lulo</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// StrategyProgressOverlay — full-screen two-step progress
// ---------------------------------------------------------------------------

interface StrategyProgressOverlayProps {
  open: boolean;
  strategyType: StrategyType;
  step: StrategyProgressStep;
  title?: string;
}

export const StrategyProgressOverlay: React.FC<StrategyProgressOverlayProps> = ({
  open,
  strategyType,
  step,
  title,
}) => {
  if (!open) return null;

  const isComplete = step === "complete";
  const isError = step === "error";
  const isRecallFlow = step === "recalling" || step === "returning";

  const firstDone = isComplete || (isRecallFlow ? step === "returning" : step === "depositing");
  const secondDone = isComplete;

  return (
    <div className="fixed inset-0 z-[80] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-6">
      <div className="neo-card-static text-center max-w-md w-full neo-slide-up">
        <div className="flex justify-center mb-4">
          <div
            className={cn(
              "neo-border rounded-full p-4 w-16 h-16 flex items-center justify-center",
              isComplete ? "bg-accent-lime" : isError ? "bg-accent-red" : "bg-accent-purple",
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} />
            ) : isError ? (
              <Landmark className="h-8 w-8" strokeWidth={2.5} />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin" strokeWidth={2.5} />
            )}
          </div>
        </div>

        <h2 className="text-2xl font-black mb-2">
          {title || (isComplete ? "Done!" : isError ? "Failed" : "Processing...")}
        </h2>
        <p className="text-sm font-medium text-muted-foreground mb-6">
          {getProgressMessage(step, strategyType)}
        </p>

        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "neo-border rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-300",
                firstDone ? "bg-accent-lime" : "bg-secondary",
              )}
            >
              {firstDone ? (
                <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {isRecallFlow ? (strategyType === "lulo" ? "Lulo Withdraw" : "Undelegate") : "Vault Withdraw"}
            </span>
          </div>

          <div className="h-px w-8 bg-foreground/20 mb-6" />

          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "neo-border rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-300",
                secondDone ? "bg-accent-lime" : step === (isRecallFlow ? "returning" : "depositing") ? "bg-secondary" : "bg-secondary/50",
              )}
            >
              {secondDone ? (
                <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
              ) : step === (isRecallFlow ? "returning" : "depositing") ? (
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
              ) : (
                <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {isRecallFlow ? "Return to Vault" : strategyType === "lulo" ? "Lulo Deposit" : "Stake"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// RecallConfirmDialog — simple confirmation before pulling funds back
// ---------------------------------------------------------------------------

interface RecallConfirmDialogProps {
  open: boolean;
  strategyType: StrategyType;
  tokenSymbol?: string;
  routedAmount: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const RecallConfirmDialog: React.FC<RecallConfirmDialogProps> = ({
  open,
  strategyType,
  tokenSymbol,
  routedAmount,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!open) return null;

  const accent = strategyType === "lulo" ? "bg-accent-purple" : "bg-accent-lime";
  const title = strategyType === "lulo" ? "Recall from Lulo" : "Unstake SOL";
  const unit = strategyType === "lulo" ? tokenSymbol || "tokens" : "SOL";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-6"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        className="neo-card-static max-w-md w-full neo-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn("neo-border rounded-xl p-3 shrink-0", accent)}>
              {strategyType === "lulo" ? (
                <Landmark className="h-6 w-6" strokeWidth={2.5} />
              ) : (
                <Sprout className="h-6 w-6" strokeWidth={2.5} />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black leading-tight">{title}</h3>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                Pull {routedAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
                {unit} back to your vault.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="neo-border rounded-lg p-2 bg-secondary hover:bg-secondary/70 transition-colors shrink-0 disabled:opacity-50"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="mt-4 neo-border rounded-xl p-4 bg-secondary flex items-start gap-3">
          <Landmark className="h-5 w-5 shrink-0 mt-0.5" strokeWidth={2.5} />
          <div>
            <p className="text-sm font-bold">One-signature recall</p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              The backend handles the {strategyType === "lulo" ? "Lulo" : "staking"} withdrawal and returns funds to your vault automatically.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t-2 border-foreground/10">
          <Button variant="outline" size="default" onClick={onCancel} disabled={loading} className="sm:w-auto w-full">
            Cancel
          </Button>
          <Button
            variant={strategyType === "lulo" ? "purple" : "lime"}
            size="default"
            onClick={onConfirm}
            disabled={loading}
            className="sm:w-auto w-full"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Recalling…</>
            ) : (
              <><ArrowLeftRight className="h-4 w-4" /> {title}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PreflightRecallDialog — shown before claim / emergency withdraw
// Detects active strategies and warns user they'll be auto-recalled
// ---------------------------------------------------------------------------

interface PreflightRecallDialogProps {
  open: boolean;
  strategies: Strategy[];
  actionName: string; // "Claim" or "Emergency Withdraw"
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const PreflightRecallDialog: React.FC<PreflightRecallDialogProps> = ({
  open,
  strategies,
  actionName,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!open) return null;

  const activeStrategies = strategies.filter((s) => s.active);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-6"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        className="neo-card-static max-w-lg w-full neo-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="bg-accent-yellow neo-border rounded-xl p-3 shrink-0">
            <Zap className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-black leading-tight">
              Active Strategies Detected
            </h3>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Before {actionName.toLowerCase()}, we need to recall funds from your active strategies.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {activeStrategies.map((s, i) => (
            <div key={i} className="neo-border rounded-lg p-3 bg-secondary flex items-center gap-3">
              <div
                className={cn(
                  "neo-border rounded-lg p-2 shrink-0",
                  s.type === "lulo" ? "bg-accent-purple" : "bg-accent-lime",
                )}
              >
                {s.type === "lulo" ? (
                  <Landmark className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Sprout className="h-4 w-4" strokeWidth={2.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">
                  {s.type === "lulo"
                    ? `${(s as Extract<Strategy, { type: "lulo" }>).amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens @ Lulo`
                    : `${(s as Extract<Strategy, { type: "staking" }>).amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL staked`}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Will be recalled automatically — one signature total
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 neo-border rounded-xl p-4 bg-accent-yellow/10">
          <p className="text-sm font-bold">
            One transaction, one signature
          </p>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            The backend handles all recalls and the final {actionName.toLowerCase()} in a single flow.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t-2 border-foreground/10">
          <Button variant="outline" size="default" onClick={onCancel} disabled={loading} className="sm:w-auto w-full">
            Cancel
          </Button>
          <Button
            variant="lime"
            size="default"
            onClick={onConfirm}
            disabled={loading}
            className="sm:w-auto w-full"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</>
            ) : (
              <><Zap className="h-4 w-4" /> {actionName} All</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
