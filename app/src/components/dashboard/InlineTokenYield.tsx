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
  if (!config || !config.luloSupported) return null;

  const isActive = strategy?.active ?? false;
  const isWorking = loading || progressStep !== "idle";

  // Active — the row is already marked by its accent rule, so all that is
  // needed here is the way back.
  if (isActive && strategy?.type === "lulo") {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onRecall}
          disabled={isWorking}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors",
            isWorking
              ? "border-tile-line bg-tile-soft opacity-50"
              : "border-accent-yellow bg-accent-yellow hover:brightness-95",
          )}
        >
          {isWorking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ArrowLeftRight className="h-3 w-3" />
          )}
          {t("yield.recall")}
        </button>

        {progressStep !== "idle" && progressStep !== "complete" && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {getProgressMessage(progressStep, "lulo", t)}
          </span>
        )}
        {progressStep === "complete" && (
          <span className="flex items-center gap-1 text-[10px] font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            {t("yield.done")}
          </span>
        )}
      </div>
    );
  }

  // Inactive — offered only where yield is actually available for the mint.
  return (
    <button
      onClick={onEnable}
      disabled={isWorking || vaultBalance <= 0}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors",
        isWorking || vaultBalance <= 0
          ? "border-tile-line bg-tile-soft opacity-50"
          : "border-accent-yellow bg-accent-yellow hover:brightness-95",
      )}
    >
      {isWorking ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <TrendingUp className="h-3 w-3" />
      )}
      {t("yield.earn")}
    </button>
  );
};
