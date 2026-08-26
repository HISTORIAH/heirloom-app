import { cn } from "@/lib/utils";
import { ArrowLeftRight, Check, Loader2, Sprout, Timer } from "lucide-react";
import { type SolStakingIndicatorProps } from "@/types/strategy-ui";
import { useTranslation } from "@heirloom/i18n";

/**
 * The "this SOL is earning" strip. Rendered only once a stake is live, the
 * panel owns the call to action for the inactive case.
 */
export const SolStakingIndicator: React.FC<SolStakingIndicatorProps> = ({
  solBalance,
  strategy,
  onEnable,
  onRecall,
  loading = false,
  progressStep = "idle",
}) => {
  const { t } = useTranslation("app");
  const isWorking = loading || (progressStep !== "idle" && progressStep !== "complete");

  if (!strategy?.active || strategy.type !== "staking") {
    return (
      <button
        onClick={onEnable}
        disabled={isWorking || solBalance <= 0}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-tile-line py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-tile-soft disabled:opacity-40"
      >
        <Sprout className="h-3.5 w-3.5" /> {t("yield.stakeForApy", { apy: "6.2" })}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-accent-lime/50 bg-accent-lime/10 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold tabular-nums">
          <Sprout className="h-4 w-4 shrink-0 text-accent-lime" strokeWidth={2} />
          {t("yield.solStakedAmount", {
            amount: strategy.amount.toLocaleString(undefined, { maximumFractionDigits: 4 }),
          })}
          <span className="text-muted-foreground">· {strategy.apy.toFixed(1)}% APY</span>
        </span>

        <button
          onClick={onRecall}
          disabled={isWorking}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-lg border border-tile-line bg-background px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-tile-soft",
            isWorking && "opacity-50",
          )}
        >
          {isWorking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ArrowLeftRight className="h-3 w-3" />
          )}
          {t("yield.unstake")}
        </button>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        {isWorking ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            {progressStep === "recalling"
              ? t("yield.undelegateProgress")
              : progressStep === "returning"
                ? t("yield.returningVaultProgress")
                : t("common.working")}
          </>
        ) : progressStep === "complete" ? (
          <>
            <Check className="h-3 w-3" strokeWidth={3} /> {t("yield.doneShort")}
          </>
        ) : (
          <>
            <Timer className="h-3 w-3" /> {t("yield.rewardsEpochTwoDays")}
          </>
        )}
      </p>
    </div>
  );
};
