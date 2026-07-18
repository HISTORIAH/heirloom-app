import { CheckCircle } from "lucide-react";

interface StepperProps {
  steps: readonly string[];
  currentStep: number;
  completedSteps: number;
  onStepClick: (index: number) => void;
  accentColor: string;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep, completedSteps, onStepClick, accentColor }) => {
  return (
    <div className="flex items-start">
      {steps.map((label, i) => {
        const isDone = i < completedSteps || currentStep >= 4;
        const isActive = i === currentStep && currentStep < 4;
        const isClickable = isDone && i < currentStep;
        const isLast = i === steps.length - 1;

        return (
          <div key={label} className={`flex items-start ${isLast ? "" : "flex-1"}`}>
            <div className="flex flex-col items-center gap-2.5">
              <button
                onClick={() => isClickable && onStepClick(i)}
                disabled={!isClickable}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-base md:text-lg transition-all duration-300 border-4 border-foreground shrink-0 ${
                  isClickable ? "cursor-pointer" : "cursor-default"
                } ${isActive ? "scale-110" : ""}`}
                style={
                  isActive
                    ? { backgroundColor: accentColor, boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }
                    : isDone
                      ? { backgroundColor: "hsl(var(--accent-lime))" }
                      : { backgroundColor: "white" }
                }
              >
                {isDone ? <CheckCircle className="h-5 w-5" strokeWidth={2.5} /> : i + 1}
              </button>
              <span
                className={`text-xs font-bold uppercase tracking-[2px] whitespace-nowrap ${
                  isActive || isDone ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div className="flex-1 self-start mt-5 md:mt-6 mx-2 md:mx-4">
                <div
                  className="h-1 md:h-1.5 w-full"
                  style={{
                    backgroundColor: isDone ? "hsl(var(--accent-lime))" : "hsl(var(--foreground))",
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;
