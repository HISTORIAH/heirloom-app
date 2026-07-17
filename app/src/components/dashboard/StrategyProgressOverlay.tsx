import { getProgressMessage } from "@/lib/strategies";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  Landmark,
  Sprout,
  Timer,
} from "lucide-react";
import { type StrategyProgressOverlayProps } from "@/types/strategy-ui";

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
  const isStaking = strategyType === "staking";

  const firstDone = isComplete || (isRecallFlow ? step === "returning" : step === "depositing");
  const secondDone = isComplete;

  // Step labels — staking never mentions Lulo
  const firstStepLabel = isRecallFlow
    ? (isStaking ? "Undelegate" : "Lulo Withdraw")
    : "Vault Withdraw";
  const secondStepLabel = isRecallFlow
    ? "Return to Vault"
    : (isStaking ? "Delegate" : "Lulo Deposit");

  return (
    <div className="fixed inset-0 z-[80] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-6">
      <div className="neo-card-static text-center max-w-md w-full neo-slide-up">
        <div className="flex justify-center mb-4">
          <div
            className={cn(
              "neo-border rounded-full p-4 w-16 h-16 flex items-center justify-center",
              isComplete ? "bg-accent-lime" : isError ? "bg-accent-red" : isStaking ? "bg-accent-lime" : "bg-accent-purple",
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} />
            ) : isError ? (
              isStaking ? (
                <Sprout className="h-8 w-8" strokeWidth={2.5} />
              ) : (
                <Landmark className="h-8 w-8" strokeWidth={2.5} />
              )
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

        {/* Two-step progress */}
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
              {firstStepLabel}
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
              {secondStepLabel}
            </span>
          </div>
        </div>

        {/* Epoch notice for staking */}
        {isStaking && isComplete && (
          <div className="mt-6 neo-border rounded-xl p-4 bg-accent-yellow/10 flex items-start gap-3">
            <Timer className="h-5 w-5 shrink-0 mt-0.5 text-accent-yellow" strokeWidth={2.5} />
            <div className="text-left">
              <p className="text-sm font-bold">Delegation takes effect next epoch</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">
                Staking rewards begin accruing after the next epoch boundary (~2–3 days). You can undelegate anytime, but rewards earned during the current epoch will be credited at epoch end.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
