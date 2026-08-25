import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  steps: readonly string[];
  currentStep: number;
  completedSteps: number;
  onStepClick: (index: number) => void;
}

/**
 * The wizard's progress, drawn as the landing draws a lifecycle: marks on one
 * axis, joined by a rule. A finished step is ink, the step you are on is
 * yellow, and the ones ahead are hairline outlines — so the rail reads at a
 * glance without giving each step a colour of its own.
 */
const Stepper: React.FC<StepperProps> = ({ steps, currentStep, completedSteps, onStepClick }) => (
  <ol className="flex items-start">
    {steps.map((label, i) => {
      const isDone = i < completedSteps || currentStep >= steps.length;
      const isActive = i === currentStep && currentStep < steps.length;
      const isClickable = isDone && i < currentStep;
      const isLast = i === steps.length - 1;

      return (
        <li key={label} className={cn("flex items-start", !isLast && "flex-1")}>
          <div className="flex flex-col items-center gap-2.5">
            <button
              onClick={() => isClickable && onStepClick(i)}
              disabled={!isClickable}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors duration-200 md:h-11 md:w-11",
                isClickable ? "cursor-pointer" : "cursor-default",
                isActive && "border-accent-yellow bg-accent-yellow",
                isDone && "border-foreground bg-foreground text-background",
                !isActive && !isDone && "border-tile-line bg-background text-muted-foreground",
              )}
            >
              {isDone ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
            </button>
            <span
              className={cn(
                "whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.16em] md:text-[11px]",
                isActive || isDone ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </div>
          {!isLast && (
            <div className="mt-5 flex-1 px-2 md:mt-[22px] md:px-4">
              <div className={cn("h-px w-full", isDone ? "bg-foreground" : "bg-tile-line")} />
            </div>
          )}
        </li>
      );
    })}
  </ol>
);

export default Stepper;
