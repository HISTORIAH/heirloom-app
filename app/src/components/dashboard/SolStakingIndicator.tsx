import { getProgressMessage } from "@/lib/strategies";
import { cn } from "@/lib/utils";
import {
  Sprout,
  Loader2,
  ArrowLeftRight,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { type SolStakingIndicatorProps } from "@/types/strategy-ui";
import { useTranslation } from "@heirloom/i18n";

export const SolStakingIndicator: React.FC<SolStakingIndicatorProps> = ({
  solBalance,
  strategy,
  onEnable,
  onRecall,
  loading = false,
  progressStep = "idle",
}) => {
  const { t, i18n } = useTranslation("app");
  const isActive = strategy?.active ?? false;
  const isWorking = loading || progressStep !== "idle";

  if (isActive && strategy?.type === "staking") {
    const staked = strategy;
    return (
      <div className="flex items-center gap-2 flex-wrap mt-3">
        <span className="inline-flex items-center gap-1 neo-border rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide bg-accent-lime/10 border-accent-lime/40">
          <Sprout className="h-3 w-3 text-accent-lime" />
          {staked.amount.toLocaleString(i18n.language, { maximumFractionDigits: 4 })} SOL
          <span className="text-accent-lime">@ {staked.apy.toFixed(1)}%</span>
        </span>
        <button
          onClick={onRecall}
          disabled={isWorking}
          className={cn(
            "neo-border rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors shrink-0",
            isWorking
              ? "bg-secondary opacity-50"
              : "bg-accent-yellow hover:bg-accent-yellow/90",
          )}
        >
          {isWorking ? (
            <Loader2 className="h-3 w-3 animate-spin inline" />
          ) : (
            <ArrowLeftRight className="h-3 w-3 inline" />
          )}
          <span className="ml-0.5">{t("yield.unstake")}</span>
        </button>
        {progressStep !== "idle" && progressStep !== "complete" && (
          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin text-accent-lime" />
            {getProgressMessage(progressStep, "staking", t)}
          </span>
        )}
        {progressStep === "complete" && (
          <span className="text-[10px] font-bold text-accent-lime flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t("yield.done")}
          </span>
        )}

        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
          <Timer className="h-3 w-3" />
          {t("yield.rewardsEpoch")}
        </span>
      </div>
    );
  }

  // Inactive
  return (
    <div className="flex items-center gap-2 flex-wrap mt-3">
      <button
        onClick={onEnable}
        disabled={isWorking || solBalance <= 0}
        className={cn(
          "neo-border rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors flex items-center gap-1 shrink-0",
          isWorking || solBalance <= 0
            ? "bg-secondary opacity-50"
            : "bg-accent-yellow hover:bg-accent-yellow/90",
        )}
      >
        {isWorking ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Sprout className="h-3 w-3" />
        )}
        {t("yield.stakeSol")}
      </button>
      <span className="text-[10px] font-bold text-muted-foreground">
        {t("yield.approxApy", { apy: "6.2" })}
      </span>
    </div>
  );
};
