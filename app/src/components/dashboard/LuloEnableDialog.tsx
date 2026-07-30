import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getYieldConfigByMint } from "@/lib/yieldTokens";
import { cn } from "@/lib/utils";
import {
  Landmark,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Zap,
  X,
} from "lucide-react";
import { type LuloEnableDialogProps } from "@/types/strategy-ui";

export const LuloEnableDialog: React.FC<LuloEnableDialogProps> = ({
  open,
  tokenSymbol,
  tokenMint,
  vaultBalance,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [selectedMode, setSelectedMode] = useState<"protected" | "unprotected">("protected");
  const config = getYieldConfigByMint(tokenMint);

  if (!open || !config) return null;

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
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-accent-purple neo-border rounded-xl p-3 shrink-0">
              <Landmark className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl leading-tight">Enable Lulo Yield</h3>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                Route {vaultBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
                {tokenSymbol} from your vault to Lulo.
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

        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Choose deposit type
          </p>

          <button
            onClick={() => setSelectedMode("protected")}
            disabled={loading}
            className={cn(
              "w-full text-left neo-border rounded-xl p-4 transition-all duration-150",
              selectedMode === "protected"
                ? "bg-accent-cyan/10 border-foreground shadow-[4px_4px_0px_0px_hsl(var(--foreground))]"
                : "bg-secondary hover:bg-secondary/70",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "neo-border rounded-lg p-2 shrink-0",
                  selectedMode === "protected" ? "bg-accent-cyan" : "bg-secondary",
                )}
              >
                <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">Protected</span>
                  <span className="neo-badge text-[10px] px-2 py-0.5 bg-accent-cyan">Recommended</span>
                </div>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  Funds are insured against platform risk. Lower yield, higher safety.
                </p>
                <p className="text-sm font-bold mt-1">{config.apyProtected.toFixed(1)}% APY</p>
              </div>
              {selectedMode === "protected" && (
                <div className="w-4 h-4 rounded-full bg-accent-cyan neo-border shrink-0" />
              )}
            </div>
          </button>

          <button
            onClick={() => setSelectedMode("unprotected")}
            disabled={loading}
            className={cn(
              "w-full text-left neo-border rounded-xl p-4 transition-all duration-150",
              selectedMode === "unprotected"
                ? "bg-accent-orange/10 border-foreground shadow-[4px_4px_0px_0px_hsl(var(--foreground))]"
                : "bg-secondary hover:bg-secondary/70",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "neo-border rounded-lg p-2 shrink-0",
                  selectedMode === "unprotected" ? "bg-accent-orange" : "bg-secondary",
                )}
              >
                <ShieldOff className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold">Unprotected</span>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  Higher yield with no insurance. Best for risk-tolerant deposits.
                </p>
                <p className="text-sm font-bold mt-1">{config.apyUnprotected.toFixed(1)}% APY</p>
              </div>
              {selectedMode === "unprotected" && (
                <div className="w-4 h-4 rounded-full bg-accent-orange neo-border shrink-0" />
              )}
            </div>
          </button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t-2 border-foreground/10">
          <Button variant="outline" size="default" onClick={onCancel} disabled={loading} className="sm:w-auto w-full">
            Cancel
          </Button>
          <Button
            variant="purple"
            size="default"
            onClick={() => onConfirm({ protected: selectedMode === "protected" })}
            disabled={loading}
            className="sm:w-auto w-full"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</>
            ) : (
              <><Zap className="h-4 w-4" /> Route to Lulo</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
