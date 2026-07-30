import { CheckCircle } from "lucide-react";
import { SOL_DECIMALS, SECONDS_PER_DAY } from "@/lib/constants";
import { formatUiAmount, truncateAddress } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import type { TokenSelection } from "@/pages/CreateVault";

interface Props {
  heartbeatSeconds: number;
  graceSeconds: number;
  heirAddress: string;
  label: string;
  delegate: string;
  hbSigner: string;
  solAmount: number;
  tokenSelections: Record<string, TokenSelection>;
  tokens: SplTokenAsset[] | undefined;
  acknowledged: boolean;
  setAcknowledged: (v: boolean) => void;
  onEdit: (stepIndex: number) => void;
}

const ReviewStep: React.FC<Props> = ({
  heartbeatSeconds,
  graceSeconds,
  heirAddress,
  label,
  delegate,
  hbSigner,
  solAmount,
  tokenSelections,
  tokens,
  acknowledged,
  setAcknowledged,
  onEdit,
}) => {
  const selectedTokenEntries = Object.entries(tokenSelections).filter(([, v]) => v.amount > 0);
  const totalAssets = selectedTokenEntries.length + (solAmount > 0 ? 1 : 0);

  const heartbeatDays = Math.round(heartbeatSeconds / SECONDS_PER_DAY);
  const graceDays = Math.round(graceSeconds / SECONDS_PER_DAY);
  const totalDays = heartbeatDays + graceDays;

  return (
    <div>
      {/* Step header */}
      <div className="flex items-center gap-4 mb-5">
        <div className="bg-accent-lime border-4 border-foreground rounded-xl p-3.5 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
          <CheckCircle className="h-5 w-5" strokeWidth={2} />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[3px] text-accent-lime">STEP 4</div>
          <h3 className="text-2xl font-display">Review & confirm</h3>
        </div>
      </div>

      {/* Two-column grid: Timing + Deposits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Timing */}
        <div className="border-4 border-foreground rounded-[14px] p-5 bg-secondary/40">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">TIMING</span>
            <button
              onClick={() => onEdit(2)}
              className="font-mono font-bold text-xs border-2 border-foreground rounded-full px-3.5 py-1 bg-background hover:bg-secondary transition-colors"
            >
              EDIT
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">Interval</span>
              <span className="font-bold">{heartbeatDays} days</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">Grace</span>
              <span className="font-bold">{graceDays} days</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-t-2 border-foreground mt-2">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">{totalDays} days</span>
            </div>
          </div>
        </div>

        {/* Deposits */}
        <div className="border-4 border-foreground rounded-[14px] p-5 bg-secondary/40">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">DEPOSITS</span>
            <button
              onClick={() => onEdit(1)}
              className="font-mono font-bold text-xs border-2 border-foreground rounded-full px-3.5 py-1 bg-background hover:bg-secondary transition-colors"
            >
              EDIT
            </button>
          </div>
          {solAmount > 0 && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">SOL</span>
              <span className="font-bold">
                {solAmount.toFixed(Math.min(6, SOL_DECIMALS))}
              </span>
            </div>
          )}
          {selectedTokenEntries.map(([mint, sel]) => {
            const tok = (tokens ?? []).find((t) => t.mint === mint);
            const tokLabel = tok?.symbol || tok?.label || mint.slice(0, 8);
            return (
              <div key={mint} className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">
                  {tokLabel} <span className="text-xs">({truncateAddress(mint, 4)})</span>
                </span>
                <span className="font-bold">{formatUiAmount(sel.amount)}</span>
              </div>
            );
          })}
          {totalAssets === 0 && (
            <div className="text-sm text-muted-foreground">
              No deposits — empty estate, fund it later
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2 border-t-2 border-dashed border-gray-200 pt-2">
            {totalAssets} asset{totalAssets !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      {/* Heir */}
      <div className="border-4 border-foreground rounded-[14px] p-5 bg-secondary/40 mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">HEIR</span>
          <button
            onClick={() => onEdit(0)}
            className="font-mono font-bold text-xs border-2 border-foreground rounded-full px-3.5 py-1 bg-background hover:bg-secondary transition-colors"
          >
            EDIT
          </button>
        </div>
        <p className="font-bold text-base">
          {label} · {truncateAddress(heirAddress, 4)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          100% allocation
          {delegate && ` · guardian ${truncateAddress(delegate, 4)}`}
          {hbSigner && ` · signer ${truncateAddress(hbSigner, 4)}`}
        </p>
      </div>

      {/* Acknowledgment */}
      <button
        onClick={() => setAcknowledged(!acknowledged)}
        className={`w-full flex items-start gap-3.5 border-4 border-foreground rounded-xl p-4 cursor-pointer transition-colors ${
          acknowledged ? "bg-[hsl(var(--step-accent)/0.1)]" : "bg-background"
        }`}
      >
        <div
          className={`w-6 h-6 shrink-0 border-4 border-foreground rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
            acknowledged ? "bg-[hsl(var(--step-accent))]" : "bg-background"
          }`}
        >
          {acknowledged && "✓"}
        </div>
        <span className="text-sm leading-relaxed text-left">
          I understand that if I don&apos;t check in for <strong>{totalDays} days</strong> ({heartbeatDays}-day
          interval + {graceDays}-day grace), my heir can claim these assets on-chain.
        </span>
      </button>

      <p className="text-xs text-muted-foreground text-right mt-2">
        Estimated network fee: ~0.002 SOL
      </p>
    </div>
  );
};

export default ReviewStep;
