import { SOL_DECIMALS } from "@/lib/constants";
import { formatUiAmount } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import { CheckCircle } from "lucide-react";

interface Props {
  heartbeatSeconds: number;
  graceSeconds: number;
  heirAddress: string;
  label: string;
  delegate: string;
  hbSigner: string;
  solAmount: number;
  tokenAmounts: Record<string, number>;
  tokens: SplTokenAsset[] | undefined;
}

const ReviewStep: React.FC<Props> = ({
  heartbeatSeconds,
  graceSeconds,
  heirAddress,
  label,
  delegate,
  hbSigner,
  solAmount,
  tokenAmounts,
  tokens,
}) => {
  const selectedTokenEntries = Object.entries(tokenAmounts).filter(([, v]) => v > 0);
  const totalAssets = selectedTokenEntries.length + (solAmount > 0 ? 1 : 0);

  const heartbeatDays = Math.round(heartbeatSeconds / 86400);
  const graceDays = Math.round(graceSeconds / 86400);
  const totalDays = heartbeatDays + graceDays;

  const shortenAddress = (addr: string) => {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
  };

  return (
    <div className="neo-card-static p-8" style={{ boxShadow: "12px 12px 0 0 hsl(var(--accent-lime))" }}>
      {/* Step header inside the card */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="bg-accent-lime neo-border rounded-xl p-3"
          style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}
        >
          <CheckCircle className="h-5 w-5" strokeWidth={2} />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-accent-lime">
            Step 4
          </span>
          <h3 className="text-xl font-semibold font-body">Review & confirm</h3>
        </div>
      </div>

      {/* Two column grid: Timing + Deposits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Timing */}
        <div className="neo-border rounded-xl p-3 bg-secondary/40">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Timing
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="font-medium">Interval</span>
              <span className="font-semibold text-lg">{heartbeatDays} days</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Grace</span>
              <span className="font-semibold text-lg">{graceDays} days</span>
            </div>
            <div className="flex justify-between border-t-2 border-foreground pt-1 mt-1">
              <span className="font-medium">Total</span>
              <span className="font-semibold text-lg">{totalDays} days</span>
            </div>
          </div>
        </div>

        {/* Deposits */}
        <div className="neo-border rounded-xl p-3 bg-secondary/40">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Deposits
          </h4>
          {solAmount > 0 && (
            <div className="flex justify-between mb-1">
              <span className="font-medium">SOL</span>
              <span className="font-semibold text-lg">
                {solAmount.toFixed(Math.min(6, SOL_DECIMALS))}
              </span>
            </div>
          )}
          {selectedTokenEntries.map(([mint, amt]) => {
            const tok = (tokens ?? []).find((t) => t.mint === mint);
            const tokLabel = tok?.label ?? mint.slice(0, 8);
            return (
              <div key={mint} className="flex justify-between mb-1">
                <span className="font-medium">{tokLabel}</span>
                <span className="font-semibold text-lg">{formatUiAmount(amt)}</span>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground font-medium mt-1 border-t-2 border-foreground/10 pt-1">
            {totalAssets} asset{totalAssets !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      {/* Heir */}
      <div className="neo-border rounded-xl p-3 bg-secondary/40 mb-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
          Heir
        </h4>
        <p className="font-semibold text-base">{label}</p>
        <p className="text-xs font-mono text-muted-foreground break-all">
          {shortenAddress(heirAddress)}
        </p>
      </div>

      {/* Optional: Guardian and Heartbeat Signer */}
      {(delegate || hbSigner) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {delegate && (
            <div className="neo-border rounded-xl p-3 bg-accent-purple/10">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Guardian
              </h4>
              <p className="font-mono text-xs break-all">{shortenAddress(delegate)}</p>
            </div>
          )}
          {hbSigner && (
            <div className="neo-border rounded-xl p-3 bg-accent-pink/10">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Heartbeat Signer
              </h4>
              <p className="font-mono text-xs break-all">{shortenAddress(hbSigner)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewStep;
