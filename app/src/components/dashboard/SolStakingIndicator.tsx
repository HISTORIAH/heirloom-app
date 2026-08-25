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
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-tile-line pt-4">
        <span className="tag tag-live">
          <Sprout className="h-3 w-3" />
          {staked.amount.toLocaleString(i18n.language, { maximumFractionDigits: 4 })} SOL @{" "}
          {staked.apy.toFixed(1)}%
        </span>
        <button
          onClick={onRecall}
          disabled={isWorking}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors",
            isWorking
              ? "border-tile-line bg-tile-soft opacity-50"
              : "border-tile-line bg-background hover:border-foreground hover:bg-tile-soft",
          )}
        >
          {isWorking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ArrowLeftRight className="h-3 w-3" />
          )}
          {t("yield.unstake")}
        </button>

        {progressStep !== "idle" && progressStep !== "complete" && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {getProgressMessage(progressStep, "staking", t)}
          </span>
        )}
        {progressStep === "complete" && (
          <span className="flex items-center gap-1 text-[10px] font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            {t("yield.done")}
          </span>
        )}

        <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
          <Timer className="h-3 w-3" />
          {t("yield.rewardsEpoch")}
        </span>
      </div>
    );
  }

  // Inactive: an offer, kept quiet — the balance above it is the headline.
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-tile-line pt-4">
      <button
        onClick={onEnable}
        disabled={isWorking || solBalance <= 0}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors",
          isWorking || solBalance <= 0
            ? "border-tile-line bg-tile-soft opacity-50"
            : "border-accent-yellow bg-accent-yellow hover:brightness-95",
        )}
      >
        {isWorking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sprout className="h-3 w-3" />}
        {t("yield.stakeSol")}
      </button>
      <span className="text-[11px] font-medium text-muted-foreground">
        {t("yield.approxApy", { apy: "6.2" })}
      </span>
    </div>
  );
};
