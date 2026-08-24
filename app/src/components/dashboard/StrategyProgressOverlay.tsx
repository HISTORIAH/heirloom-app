import { cn } from "@/lib/utils";
import { Check, Loader2, Timer } from "lucide-react";
import { type StrategyProgressOverlayProps } from "@/types/strategy-ui";
import { useTranslation } from "@heirloom/i18n";

const Step: React.FC<{ label: string; state: "done" | "active" | "waiting" }> = ({
  label,
  state,
}) => (
  <div className="flex flex-1 flex-col items-center gap-2">
    <div
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full border transition-colors",
        state === "done"
          ? "border-transparent bg-foreground text-background"
          : state === "active"
            ? "border-foreground"
            : "border-tile-line text-muted-foreground",
      )}
    >
      {state === "done" ? (
        <Check className="h-4 w-4" strokeWidth={3} />
      ) : state === "active" ? (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
      )}
    </div>
    <span className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
    </span>
  </div>
);

export const StrategyProgressOverlay: React.FC<StrategyProgressOverlayProps> = ({
  open,
  strategyType,
  step,
  title,
}) => {
  const { t } = useTranslation("app");
  if (!open) return null;

  const isComplete = step === "complete";
  const isError = step === "error";
  const isRecallFlow = step === "recalling" || step === "returning";
  const isStaking = strategyType === "staking";

  const firstDone = isComplete || (isRecallFlow ? step === "returning" : step === "depositing");
  const secondActive = step === (isRecallFlow ? "returning" : "depositing");

  const progressCopy: Record<string, string> = {
    withdrawing: t("yield.progressWithdrawVault"),
    depositing: t("yield.progressDepositStrategy"),
    recalling: t("yield.progressPullStrategy"),
    returning: t("yield.progressReturnVault"),
    complete: t("yield.allDone"),
    error: t("yield.nothingMoved"),
  };

  const firstStepLabel = isRecallFlow
    ? isStaking
      ? t("yield.stepUndelegate")
      : t("yield.withdrawFromLulo")
    : t("yield.withdrawFromVault");
  const secondStepLabel = isRecallFlow
    ? t("yield.returnToVault")
    : isStaking
      ? t("yield.stepDelegate")
      : t("yield.depositToLulo");

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/25 p-6 backdrop-blur-[3px]"
    >
      <div className="modal-rise w-full max-w-md overflow-hidden rounded-xl border border-tile-line bg-background shadow-[0_24px_64px_-24px_hsl(var(--foreground)/0.35)]">
        <div className="border-b border-tile-line px-6 py-6 text-center">
          <span className="ed-label">
            {isStaking ? t("yield.capStaking") : t("yield.capYield")}
          </span>
          <h2 className={cn("ed-h3 mt-2", isError && "text-accent-red")}>
            {title || (isComplete ? t("yield.doneShort") : isError ? t("yield.failed") : t("common.working"))}
          </h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {progressCopy[step] ?? t("common.working")}
          </p>
        </div>

        <div className="flex items-start gap-2 px-6 py-6">
          <Step label={firstStepLabel} state={firstDone ? "done" : "active"} />
          <div className="mt-[18px] h-px flex-1 bg-tile-line" />
          <Step
            label={secondStepLabel}
            state={isComplete ? "done" : secondActive ? "active" : "waiting"}
          />
        </div>

        {isStaking && isComplete && (
          <div className="flex items-start gap-3 border-t border-tile-line px-6 py-4">
            <Timer className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
            <p className="text-xs font-medium text-muted-foreground">
              {t("yield.epochActiveNote")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
