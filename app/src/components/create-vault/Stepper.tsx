import { cn } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

interface StepperProps {
  steps: readonly string[];
  currentStep: number;
  completedSteps: number;
  onStepClick: (index: number) => void;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep, completedSteps, onStepClick }) => {
  const { t } = useTranslation("app");
  return (
    <nav
      aria-label={t("createVault.wizard.stepsAria")}
      className="flex flex-wrap items-center gap-1"
    >
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
              "flex min-h-[44px] items-center gap-2 rounded-full px-2.5 text-[13px] font-medium transition-colors",
              isActive && "font-bold text-foreground",
              !isActive && isDone && "text-foreground",
              !isActive && !isDone && "text-muted-foreground",
              isClickable ? "cursor-pointer hover:bg-tile-soft" : "cursor-default",
            )}
          >
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold tabular-nums",
                isActive && "border-foreground bg-foreground text-background",
                !isActive && isDone && "border-foreground bg-background text-foreground",
                !isActive && !isDone && "border-tile-line bg-background text-muted-foreground",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
};

export default Stepper;
