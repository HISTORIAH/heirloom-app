import {
  type Strategy,
  type StrategyProgressStep,
} from "@/types/strategy-ui";
import { getProgressMessage } from "@/lib/strategies";
import { getYieldConfigByMint } from "@/lib/yieldTokens";
import { formatTokenAmount, cn } from "@/lib/utils";
import {
  ShieldCheck,
  ShieldOff,
  Loader2,
  ArrowLeftRight,
  CheckCircle2,
  Zap,
  TrendingUp,
} from "lucide-react";
import { type InlineTokenYieldProps } from "@/types/strategy-ui";

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

  // Active state — compact pill with recall button
  if (isActive && strategy?.type === "lulo") {
    const lulo = strategy;
    const formatted = formatTokenAmount(
      BigInt(Math.round(lulo.amount * 10 ** decimals)),
      decimals,
    );

    return (
      <div className="flex items-center gap-2 shrink-0">
        {/* Active badge */}
        <span
          className={cn(
            "inline-flex items-center gap-1 neo-border rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide",
            lulo.protected
              ? "bg-accent-cyan/10 border-accent-cyan/40"
              : "bg-accent-orange/10 border-accent-orange/40",
          )}
        >
          {lulo.protected ? (
            <ShieldCheck className="h-3 w-3 text-accent-cyan" />
          ) : (
            <ShieldOff className="h-3 w-3 text-accent-orange" />
          )}
          <Zap className="h-3 w-3" />
          {formatted} {symbol} @ {lulo.apy.toFixed(1)}%
        </span>

        {/* Recall button */}
        <button
          onClick={onRecall}
          disabled={isWorking}
          className={cn(
            "neo-border rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide transition-colors shrink-0",
            isWorking
              ? "bg-secondary opacity-50"
              : "bg-accent-purple text-primary-foreground hover:bg-accent-purple/90",
          )}
        >
          {isWorking ? (
            <Loader2 className="h-3 w-3 animate-spin inline" />
          ) : (
            <ArrowLeftRight className="h-3 w-3 inline" />
          )}
          <span className="ml-0.5">Recall</span>
        </button>

        {/* Inline progress */}
        {progressStep !== "idle" && progressStep !== "complete" && (
          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin text-accent-purple" />
            {getProgressMessage(progressStep, "lulo")}
          </span>
        )}
        {progressStep === "complete" && (
          <span className="text-[10px] font-bold text-accent-lime flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Done
          </span>
        )}
      </div>
    );
  }

  // Inactive state — compact earn yield button
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={onEnable}
        disabled={isWorking || vaultBalance <= 0}
        className={cn(
          "neo-border rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide transition-colors flex items-center gap-1 shrink-0",
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
      <span className="text-[10px] font-bold text-accent-purple">
        Up to {config.apyUnprotected.toFixed(1)}% APY
      </span>
    </div>
  );
};
