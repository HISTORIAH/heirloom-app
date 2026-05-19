import { SOL_DECIMALS, SOL_LABEL } from "@/lib/constants";
import { formatDuration as fmtDuration, formatUiAmount } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import { Heart, Shield } from "lucide-react";

const formatDuration = (s: number) => fmtDuration(s, { long: true });

interface Props {
  heartbeatSeconds: number;
  graceSeconds: number;
  pauseSeconds: number;
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
  pauseSeconds,
  heirAddress,
  label,
  delegate,
  hbSigner,
  solAmount,
  tokenAmounts,
  tokens,
}) => {
  const selectedTokenEntries = Object.entries(tokenAmounts).filter(([, v]) => v > 0);

  return (
    <div className="space-y-8">
      <div>
        <span className="neo-badge bg-accent-lime mb-4 inline-block">Step 4</span>
        <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
          Review & <span className="bg-accent-lime px-2 inline-block rotate-[1deg]">confirm.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="neo-card-static">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Timing
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-bold">Interval</span>
              <span className="font-black text-xl">{formatDuration(heartbeatSeconds)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Grace</span>
              <span className="font-black text-xl">{formatDuration(graceSeconds)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Pause</span>
              <span className="font-black text-xl">{formatDuration(pauseSeconds)}</span>
            </div>
            <div className="flex justify-between border-t-4 border-foreground pt-2 mt-2">
              <span className="font-bold">Total</span>
              <span className="font-black text-xl">
                {formatDuration(heartbeatSeconds + graceSeconds)}
              </span>
            </div>
          </div>
        </div>

        <div className="neo-card-static">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Deposits
          </h3>
          {solAmount > 0 && (
            <div className="flex justify-between mb-2">
              <span className="font-bold">{SOL_LABEL}</span>
              <span className="font-black text-xl">{solAmount.toFixed(Math.min(6, SOL_DECIMALS))}</span>
            </div>
          )}
          {selectedTokenEntries.map(([mint, amt]) => {
            const tok = (tokens ?? []).find((t) => t.mint === mint);
            const tokLabel = tok?.label ?? mint.slice(0, 8);
            return (
              <div key={mint} className="flex justify-between mb-2">
                <span className="font-bold">{tokLabel}</span>
                <span className="font-black text-xl">{formatUiAmount(amt)}</span>
              </div>
            );
          })}
          {selectedTokenEntries.length > 0 && (
            <p className="text-xs text-muted-foreground font-medium mt-2 border-t-2 border-foreground/10 pt-2">
              {selectedTokenEntries.length + (solAmount > 0 ? 1 : 0)} asset(s) total
              {selectedTokenEntries.length > 0 && " — tokens require separate transactions"}
            </p>
          )}
        </div>
      </div>

      <div className="neo-card-static">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Heir
        </h3>
        <p className="font-black text-lg">{label}</p>
        <p className="text-xs font-mono text-muted-foreground break-all">{heirAddress}</p>
      </div>

      {delegate && (
        <div className="neo-card-static bg-accent-purple/10">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5" strokeWidth={2.5} />
            <p className="font-bold">
              Guardian: <span className="font-mono text-sm break-all">{delegate}</span>
            </p>
          </div>
        </div>
      )}

      {hbSigner && (
        <div className="neo-card-static bg-accent-pink/10">
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5" strokeWidth={2.5} />
            <p className="font-bold">
              Heartbeat Signer: <span className="font-mono text-sm break-all">{hbSigner}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewStep;
