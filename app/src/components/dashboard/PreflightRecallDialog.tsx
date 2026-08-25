import { Button } from "@/components/ui/button";
import Sheet from "@/components/app/Sheet";
import { type Strategy } from "@/types/strategy-ui";
import { Landmark, Sprout, Loader2, Zap } from "lucide-react";
import { type PreflightRecallDialogProps } from "@/types/strategy-ui";

export const PreflightRecallDialog: React.FC<PreflightRecallDialogProps> = ({
  open,
  strategies,
  actionName,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const activeStrategies = strategies.filter((s) => s.active);

  return (
    <Sheet
      open={open}
      title="Active strategies detected"
      caption="Before you continue"
      size="lg"
      busy={loading}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</>
            ) : (
              <><Zap className="h-4 w-4" /> {actionName} all</>
            )}
          </Button>
        </>
      }
    >
      <p className="text-sm font-medium text-muted-foreground">
        Before {actionName.toLowerCase()}, funds have to come back from the strategies they are
        working in. That happens automatically, in one signature.
      </p>

      <div className="mt-5">
        {activeStrategies.map((s, i) => (
          <div key={i} className="data-row items-center">
            <span className="flex items-center gap-2.5">
              {s.type === "lulo" ? (
                <Landmark className="h-4 w-4 shrink-0" strokeWidth={2} />
              ) : (
                <Sprout className="h-4 w-4 shrink-0" strokeWidth={2} />
              )}
              <span className="data-v">
                {s.type === "lulo"
                  ? `${(s as Extract<Strategy, { type: "lulo" }>).amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens @ Lulo`
                  : `${(s as Extract<Strategy, { type: "staking" }>).amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL staked`}
              </span>
            </span>
            <span className="data-k text-xs">Recalled automatically</span>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-tile-line pt-4">
        <p className="text-sm font-semibold">One transaction, one signature</p>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
          The recalls and the final {actionName.toLowerCase()} run as a single flow.
        </p>
      </div>
    </Sheet>
  );
};
