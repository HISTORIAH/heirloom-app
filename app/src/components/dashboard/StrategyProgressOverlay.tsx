import { getProgressMessage } from "@/lib/strategies";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, Timer } from "lucide-react";
import { type StrategyProgressOverlayProps } from "@/types/strategy-ui";
import { useTranslation } from "@heirloom/i18n";

/**
 * A two-step move, drawn the way the landing draws a lifecycle: marks joined
 * by a line, with the state of each mark saying where the funds are. It is a
 * sheet rather than a card because the page underneath is genuinely locked
 * while a signature is out.
 */
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

  // Step labels — staking never mentions Lulo
  const firstStepLabel = isRecallFlow
    ? (isStaking ? t("yield.stepUndelegate") : t("yield.stepLuloWithdraw"))
    : t("yield.stepVaultWithdraw");
  const secondStepLabel = isRecallFlow
    ? t("yield.stepReturn")
    : (isStaking ? t("yield.stepDelegate") : t("yield.stepLuloDeposit"));

  const marks = [
    { label: firstStepLabel, done: firstDone, active: !firstDone },
    { label: secondStepLabel, done: isComplete, active: secondActive },
  ];

  return createPortal(
    <div className="scrim z-[80]">
      <div className="sheet rise-in my-auto max-w-md px-6 py-7 text-center">
        <p className="cap">{isRecallFlow ? t("yield.recall") : t("yield.earn")}</p>
        <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em]">
          {title || (isComplete ? t("yield.done") : isError ? t("yield.failed") : t("yield.processing"))}
        </h2>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          {getProgressMessage(step, strategyType, t)}
        </p>

        <div className="mt-7 flex items-start justify-center gap-2">
          {marks.map((mark, i) => (
            <div key={mark.label} className="contents">
              {i > 0 && (
                <span aria-hidden="true" className="mt-6 h-px w-10 shrink-0 bg-tile-line md:w-14" />
              )}
              <div className="flex w-28 flex-col items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl border transition-colors duration-300",
                    mark.done
                      ? "border-accent-sage bg-accent-sage"
                      : mark.active
                        ? "border-foreground bg-background"
                        : "border-tile-line bg-tile-soft",
                  )}
                >
                  {mark.done ? (
                    <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
                  ) : mark.active ? (
                    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                  )}
                </span>
                <span className="cap text-center leading-tight">{mark.label}</span>
              </div>
            </div>
          ))}
        </div>

        {isStaking && isComplete && (
          <div className="mt-7 flex items-start gap-3 border-t border-tile-line pt-5 text-left">
            <Timer className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            <div>
              <p className="text-sm font-semibold">{t("yield.epochNextTitle")}</p>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                {t("yield.epochNextDesc")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
