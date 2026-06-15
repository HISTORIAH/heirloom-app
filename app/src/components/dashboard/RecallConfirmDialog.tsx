import { Button } from "@/components/ui/button";
import {
  type StrategyType,
} from "@/lib/strategies";
import { cn } from "@/lib/utils";
import {
  Landmark,
  Sprout,
  Loader2,
  ArrowLeftRight,
  X,
} from "lucide-react";

interface RecallConfirmDialogProps {
  open: boolean;
  strategyType: StrategyType;
  tokenSymbol?: string;
  routedAmount: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const RecallConfirmDialog: React.FC<RecallConfirmDialogProps> = ({
  open,
  strategyType,
  tokenSymbol,
  routedAmount,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!open) return null;

  const accent = strategyType === "lulo" ? "bg-accent-purple" : "bg-accent-lime";
  const title = strategyType === "lulo" ? "Recall from Lulo" : "Unstake SOL";
  const unit = strategyType === "lulo" ? tokenSymbol || "tokens" : "SOL";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-6"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        className="neo-card-static max-w-md w-full neo-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn("neo-border rounded-xl p-3 shrink-0", accent)}>
              {strategyType === "lulo" ? (
                <Landmark className="h-6 w-6" strokeWidth={2.5} />
              ) : (
                <Sprout className="h-6 w-6" strokeWidth={2.5} />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black leading-tight">{title}</h3>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                Pull {routedAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
                {unit} back to your vault.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="neo-border rounded-lg p-2 bg-secondary hover:bg-secondary/70 transition-colors shrink-0 disabled:opacity-50"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="mt-4 neo-border rounded-xl p-4 bg-secondary flex items-start gap-3">
          <Landmark className="h-5 w-5 shrink-0 mt-0.5" strokeWidth={2.5} />
          <div>
            <p className="text-sm font-bold">One-signature recall</p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              The backend handles the {strategyType === "lulo" ? "Lulo" : "staking"} withdrawal and returns funds to your vault automatically.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t-2 border-foreground/10">
          <Button variant="outline" size="default" onClick={onCancel} disabled={loading} className="sm:w-auto w-full">
            Cancel
          </Button>
          <Button
            variant={strategyType === "lulo" ? "purple" : "lime"}
            size="default"
            onClick={onConfirm}
            disabled={loading}
            className="sm:w-auto w-full"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Recalling…</>
            ) : (
              <><ArrowLeftRight className="h-4 w-4" /> {title}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
