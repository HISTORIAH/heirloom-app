import { cn } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

interface StepperProps {
  steps: readonly string[];
  currentStep: number;
  completedSteps: number;
  onStepClick: (index: number) => void;
}

const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}) => {
  const { t } = useTranslation("app");
  return (
  <nav aria-label={t("createVault.wizard.stepsAria")} className="flex items-center gap-1">
    {steps.map((label, i) => {
      const isDone = i < completedSteps || currentStep >= 4;
      const isActive = i === currentStep && currentStep < 4;
      const isClickable = isDone && i < currentStep;

      return (
        <button
          key={label}
          type="button"
          onClick={() => isClickable && onStepClick(i)}
          disabled={!isClickable}
          aria-label={label}
          aria-current={isActive ? "step" : undefined}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-lg border text-[11px] font-bold tabular-nums transition-colors",
            isActive && "border-foreground bg-foreground text-background",
            !isActive && isDone && "border-tile-line text-foreground hover:bg-tile-soft",
            !isActive && !isDone && "border-transparent text-muted-foreground",
            isClickable ? "cursor-pointer" : "cursor-default",
          )}
        >
          {String(i + 1).padStart(2, "0")}
        </button>
      );
    })}
  </nav>
  );
};

export default Stepper;
