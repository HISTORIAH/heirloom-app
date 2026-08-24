import { getYieldConfigByMint } from "@/lib/yieldTokens";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, Check, Loader2, TrendingUp } from "lucide-react";
import { type InlineTokenYieldProps } from "@/types/strategy-ui";
import { useTranslation } from "@heirloom/i18n";

export const InlineTokenYield: React.FC<InlineTokenYieldProps> = ({
  mint,
  vaultBalance,
  strategy,
  onEnable,
  onRecall,
  loading = false,
  progressStep = "idle",
}) => {
  const { t } = useTranslation("app");
  const config = getYieldConfigByMint(mint);
  if (!config?.luloSupported) return null;

  const isActive = strategy?.active && strategy.type === "lulo";
  const isWorking = loading || (progressStep !== "idle" && progressStep !== "complete");

  const pill =
    "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors disabled:opacity-40";

  return (
    <div className="flex shrink-0 items-center gap-2">
      {isWorking && (
        <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
          {progressStep === "recalling"
            ? t("yield.withdrawingShort")
            : progressStep === "returning"
              ? t("yield.returningShort")
              : t("common.working")}
        </span>
      )}
      {!isWorking && progressStep === "complete" && (
        <Check className="h-3.5 w-3.5 text-accent-lime" strokeWidth={3} />
      )}

      {isActive ? (
        <button
          onClick={onRecall}
          disabled={isWorking}
          className={cn(pill, "border-accent-purple/50 bg-accent-purple/15 hover:brightness-95")}
        >
          {isWorking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ArrowLeftRight className="h-3 w-3" />
          )}
          {t("yield.recall")}
        </button>
      ) : (
        <button
          onClick={onEnable}
          disabled={isWorking || vaultBalance <= 0}
          title={t("yield.earnApyTitle", { apy: config.apyProtected.toFixed(1) })}
          className={cn(pill, "border-tile-line hover:bg-tile-soft")}
        >
          {isWorking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <TrendingUp className="h-3 w-3" />
          )}
          {t("yield.earnApyShort", { apy: config.apyProtected.toFixed(1) })}
        </button>
      )}
    </div>
  );
};
