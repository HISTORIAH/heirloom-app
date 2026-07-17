import { getProgressMessage } from "@/lib/strategies";
import { getYieldConfigByMint } from "@/lib/yieldTokens";
import { cn } from "@/lib/utils";
import {
  Loader2,
  ArrowLeftRight,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { type InlineTokenYieldProps } from "@/types/strategy-ui";

export const InlineTokenYield: React.FC<InlineTokenYieldProps> = ({
  mint,
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
    return (
      <div className="flex items-center gap-2 shrink-0">
        {/* Recall button — lime pill with shadow */}
        <button
          onClick={onRecall}
          disabled={isWorking}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all shrink-0",
            "border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]",
            isWorking
              ? "bg-secondary opacity-50"
              : "bg-accent-lime hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))]"
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

  // Inactive state — compact earn yield button (only shown if yield is available)
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={onEnable}
        disabled={isWorking || vaultBalance <= 0}
        className={cn(
          "rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-1 shrink-0",
          "border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]",
          isWorking || vaultBalance <= 0
            ? "bg-secondary opacity-50"
            : "bg-accent-cyan hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))]"
        )}
      >
        {isWorking ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <TrendingUp className="h-3 w-3" />
        )}
        Earn
      </button>
    </div>
  );
};
