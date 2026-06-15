import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sprout,
  Loader2,
  Zap,
  X,
  Shield,
  Flame,
  Timer,
} from "lucide-react";

interface ValidatorOption {
  id: string;
  name: string;
  apy: number;
  commission: number; // percent
  icon: React.ReactNode;
  accent: string;
  description: string;
}

// TEMP: placeholder validator list — replace with live API before launch
const VALIDATOR_OPTIONS: ValidatorOption[] = [
  {
    id: "jito",
    name: "Jito",
    apy: 6.2,
    commission: 5,
    icon: <Flame className="h-5 w-5" strokeWidth={2.5} />,
    accent: "bg-accent-orange",
    description: "MEV-enhanced staking with automatic reward compounding.",
  },
  {
    id: "marinade",
    name: "Marinade",
    apy: 5.8,
    commission: 6,
    icon: <Shield className="h-5 w-5" strokeWidth={2.5} />,
    accent: "bg-accent-cyan",
    description: "Liquid staking with mSOL — stay liquid while earning.",
  },
];

interface StakingEnableDialogProps {
  open: boolean;
  solBalance: number;
  onConfirm: (validatorId: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const StakingEnableDialog: React.FC<StakingEnableDialogProps> = ({
  open,
  solBalance,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [selectedValidator, setSelectedValidator] = useState<string>(VALIDATOR_OPTIONS[0].id);

  if (!open) return null;

  const selected = VALIDATOR_OPTIONS.find((v) => v.id === selectedValidator)!;

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
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-accent-lime neo-border rounded-xl p-3 shrink-0">
              <Sprout className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black leading-tight">Stake SOL</h3>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                Delegate {solBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL to earn network rewards.
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

        {/* Validator list */}
        <div className="mt-6 space-y-3">
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Choose a validator
          </p>

          {VALIDATOR_OPTIONS.map((validator) => (
            <button
              key={validator.id}
              onClick={() => setSelectedValidator(validator.id)}
              disabled={loading}
              className={cn(
                "w-full text-left neo-border rounded-xl p-4 transition-all duration-150",
                selectedValidator === validator.id
                  ? "bg-accent-lime/10 border-foreground shadow-[4px_4px_0px_0px_hsl(var(--foreground))]"
                  : "bg-secondary hover:bg-secondary/70",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "neo-border rounded-lg p-2 shrink-0",
                    selectedValidator === validator.id ? validator.accent : "bg-secondary",
                  )}
                >
                  {validator.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black">{validator.name}</span>
                    <span className="neo-badge text-[10px] px-2 py-0.5 bg-accent-lime">
                      {validator.apy.toFixed(1)}% APY
                    </span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">
                    {validator.description}
                  </p>
                  <p className="text-[11px] font-bold text-muted-foreground mt-1">
                    Commission: {validator.commission}%
                  </p>
                </div>
                {selectedValidator === validator.id && (
                  <div className="w-4 h-4 rounded-full bg-accent-lime neo-border shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-4 neo-border rounded-xl p-4 bg-secondary flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Selected
          </span>
          <span className="font-black text-sm">
            {selected.name} @ {selected.apy.toFixed(1)}% APY
          </span>
        </div>

        {/* Epoch notice */}
        <div className="mt-4 neo-border rounded-xl p-4 bg-accent-yellow/10 flex items-start gap-3">
          <Timer className="h-5 w-5 shrink-0 mt-0.5 text-accent-yellow" strokeWidth={2.5} />
          <div>
            <p className="text-sm font-bold">Epoch-based staking</p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              Delegation takes effect at the next epoch boundary (~2–3 days). Rewards accrue per epoch and are credited at epoch end. You can undelegate anytime, but unstaking has a cooldown period.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t-2 border-foreground/10">
          <Button variant="outline" size="default" onClick={onCancel} disabled={loading} className="sm:w-auto w-full">
            Cancel
          </Button>
          <Button
            variant="lime"
            size="default"
            onClick={() => onConfirm(selectedValidator)}
            disabled={loading}
            className="sm:w-auto w-full"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</>
            ) : (
              <><Zap className="h-4 w-4" /> Delegate to {selected.name}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
