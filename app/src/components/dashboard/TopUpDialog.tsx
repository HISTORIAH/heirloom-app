import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TOPUP_PCTS, amountStep, pctOfMax } from "@/lib/amountInput";
import { Loader2, TrendingUp, X, Coins } from "lucide-react";
import { type TopUpDialogProps } from "@/types/strategy-ui";

export const TopUpDialog: React.FC<TopUpDialogProps> = ({
  open,
  symbol,
  decimals,
  vaultBalance,
  walletBalance,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [amount, setAmount] = useState(0);
  const step = amountStep(decimals);

  if (!open) return null;

  const applyPct = (pct: number) => {
    setAmount(pctOfMax(walletBalance, pct, step));
  };

  const handleConfirm = () => {
    if (amount <= 0) return;
    onConfirm(amount);
  };

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
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-accent-lime neo-border rounded-xl p-3 shrink-0">
              <Coins className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-normal leading-tight text-foreground">Top Up {symbol}</h3>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                Add {symbol} from your wallet to the vault.
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

        {/* Vault balance */}
        <div className="mt-4 neo-border rounded-xl p-3 bg-secondary flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Current Vault Balance
          </span>
          <span className="font-bold text-sm">
            {vaultBalance.toLocaleString(undefined, { maximumFractionDigits: decimals })} {symbol}
          </span>
        </div>

        {/* Amount input */}
        <div className="mt-4 space-y-3">
          <input
            type="number"
            min={0}
            step={step}
            value={amount || ""}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            placeholder="0"
            className="neo-input w-full font-black text-2xl text-center"
          />

          <div className="flex gap-2">
            {TOPUP_PCTS.map(({ pct, label, bg }) => (
              <button
                key={pct}
                onClick={() => applyPct(pct)}
                className={cn(
                  "flex-1 neo-border rounded-lg py-3 text-xs font-bold uppercase tracking-wide transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-[3px_3px_0px_0px_hsl(var(--foreground))] hover:shadow-[5px_5px_0px_0px_hsl(var(--foreground))] hover:-translate-x-px hover:-translate-y-px",
                  bg,
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-[11px] font-medium text-muted-foreground">
            Wallet: {walletBalance.toLocaleString(undefined, { maximumFractionDigits: decimals })} {symbol}
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t-2 border-foreground/10">
          <Button
            variant="outline"
            size="default"
            onClick={onCancel}
            disabled={loading}
            className="sm:w-auto w-full"
          >
            Cancel
          </Button>
          <Button
            variant="lime"
            size="default"
            onClick={handleConfirm}
            disabled={loading || amount <= 0 || amount > walletBalance}
            className="sm:w-auto w-full"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <><TrendingUp className="h-4 w-4" /> Top Up</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
