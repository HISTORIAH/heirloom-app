import { Button } from "@/components/ui/button";
import {
  type Strategy,
} from "@/types/strategy-ui";
import { cn } from "@/lib/utils";
import {
  Landmark,
  Sprout,
  Loader2,
  Zap,
} from "lucide-react";
import { type PreflightRecallDialogProps } from "@/types/strategy-ui";

export const PreflightRecallDialog: React.FC<PreflightRecallDialogProps> = ({
  open,
  strategies,
  actionName,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!open) return null;

  const activeStrategies = strategies.filter((s) => s.active);

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
        className="neo-card-static max-w-lg w-full neo-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="bg-accent-yellow neo-border rounded-xl p-3 shrink-0">
            <Zap className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-normal leading-tight">
              Active Strategies Detected
            </h3>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Before {actionName.toLowerCase()}, we need to recall funds from your active strategies.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {activeStrategies.map((s, i) => (
            <div key={i} className="neo-border rounded-lg p-3 bg-secondary flex items-center gap-3">
              <div
                className={cn(
                  "neo-border rounded-lg p-2 shrink-0",
                  s.type === "lulo" ? "bg-accent-purple" : "bg-accent-lime",
                )}
              >
                {s.type === "lulo" ? (
                  <Landmark className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Sprout className="h-4 w-4" strokeWidth={2.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">
                  {s.type === "lulo"
                    ? `${(s as Extract<Strategy, { type: "lulo" }>).amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens @ Lulo`
                    : `${(s as Extract<Strategy, { type: "staking" }>).amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL staked`}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Will be recalled automatically — one signature total
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 neo-border rounded-xl p-4 bg-accent-yellow/10">
          <p className="text-sm font-bold">
            One transaction, one signature
          </p>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            The backend handles all recalls and the final {actionName.toLowerCase()} in a single flow.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t-2 border-foreground/10">
          <Button variant="outline" size="default" onClick={onCancel} disabled={loading} className="sm:w-auto w-full">
            Cancel
          </Button>
          <Button
            variant="lime"
            size="default"
            onClick={onConfirm}
            disabled={loading}
            className="sm:w-auto w-full"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</>
            ) : (
              <><Zap className="h-4 w-4" /> {actionName} All</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
