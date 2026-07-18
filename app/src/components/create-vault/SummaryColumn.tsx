import { truncateAddress, formatUiAmount } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import type { TokenSelection } from "@/pages/CreateVault";

const TIPS = [
  "A guardian can pause the heartbeat once. A safety net against false triggers. Pick someone you trust not to abuse it.",
  "Hide tiny balances if it's not worth the transaction fee, it's not worth inheriting.",
  "The interval is your rhythm; the grace period is your safety net. 90 + 30 means you check in 4× a year and get a month of slack.",
  "The heir address is the one thing you can't fat-finger later. Read it out loud if you have to.",
];

const TIP_TITLES = [
  "Who is a guardian?",
  "Dust stays out.",
  "Interval vs grace.",
  "Last look.",
];

interface SummaryColumnProps {
  step: number;
  label: string;
  heirAddress: string;
  solAmount: number;
  tokenSelections: Record<string, TokenSelection>;
  tokens: SplTokenAsset[] | undefined;
  intervalDays: number;
  graceDays: number;
  totalDays: number;
  delegate: string;
  hbSigner: string;
}

const SummaryColumn: React.FC<SummaryColumnProps> = ({
  step,
  label,
  heirAddress,
  solAmount,
  tokenSelections,
  tokens,
  intervalDays,
  graceDays,
  totalDays,
  delegate,
  hbSigner,
}) => {
  const displayLabel = label.trim() || "heir";
  const selectedEntries = Object.entries(tokenSelections).filter(([, v]) => v.amount > 0);

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[3px] text-muted-foreground mb-5">
        ESTATE SO FAR
      </div>

      {/* Heir preview */}
      <div className="bg-card border-4 border-foreground rounded-[14px] p-5 shadow-[5px_5px_0_0_hsl(var(--foreground))]">
        <div className="flex items-center gap-3.5 mb-3.5">
          <div className="w-11 h-11 rounded-[10px] bg-accent-pink border-4 border-foreground flex items-center justify-center font-bold text-lg text-white shrink-0">
            {displayLabel.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-base">{displayLabel}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {heirAddress ? truncateAddress(heirAddress, 4) : "no address yet"}
            </div>
          </div>
        </div>
        <div className="w-full h-4 border-2 border-foreground rounded-full overflow-hidden bg-secondary">
          <div className="h-full w-full bg-accent-lime" />
        </div>
        <div className="text-[11px] text-muted-foreground mt-2">100% allocation · single heir</div>
      </div>

      {/* Assets */}
      <div className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground mt-6 mb-2.5">
        ASSETS
      </div>
      {solAmount <= 0 && selectedEntries.length === 0 ? (
        <div className="text-sm text-gray-400">None yet · picked in step 2</div>
      ) : (
        <div className="space-y-2.5">
          {solAmount > 0 && (
            <div className="border-2 border-foreground rounded-[10px] p-3 bg-card">
              <div className="flex justify-between text-sm font-bold">
                <span>SOL</span>
                <span className="font-normal text-muted-foreground">{solAmount} SOL</span>
              </div>
            </div>
          )}
          {selectedEntries.map(([mint, sel]) => {
            const tok = (tokens ?? []).find((t) => t.mint === mint);
            if (!tok) return null;
            return (
              <div key={mint} className="border-2 border-foreground rounded-[10px] p-3 bg-card">
                <div className="flex justify-between text-sm font-bold">
                  <span>{tok.symbol || tok.label}</span>
                  <span className="font-normal text-muted-foreground">{formatUiAmount(sel.amount)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rules */}
      <div className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground mt-6 mb-2.5">
        RULES
      </div>
      <div className="space-y-0">
        <div className="flex justify-between items-baseline py-2 border-b-2 border-dashed border-gray-200 text-sm">
          <span className="text-muted-foreground">Interval</span>
          <span className={`font-bold ${step >= 2 ? "" : "text-gray-400 font-normal"}`}>
            {step >= 2 ? `${intervalDays} days` : "step 3"}
          </span>
        </div>
        <div className="flex justify-between items-baseline py-2 border-b-2 border-dashed border-gray-200 text-sm">
          <span className="text-muted-foreground">Grace</span>
          <span className={`font-bold ${step >= 2 ? "" : "text-gray-400 font-normal"}`}>
            {step >= 2 ? `${graceDays} days` : "step 3"}
          </span>
        </div>
        {step >= 2 && (
          <div className="flex justify-between items-baseline py-2 border-b-2 border-dashed border-gray-200 text-sm">
            <span className="text-muted-foreground">Total deadline</span>
            <span className="font-bold">{totalDays} days</span>
          </div>
        )}
        <div className="flex justify-between items-baseline py-2 border-b-2 border-dashed border-gray-200 text-sm">
          <span className="text-muted-foreground">Guardian</span>
          <span className={delegate ? "font-bold" : "text-gray-400 font-normal"}>
            {delegate ? truncateAddress(delegate, 4) : "not set"}
          </span>
        </div>
        <div className="flex justify-between items-baseline py-2 border-b-2 border-dashed border-gray-200 text-sm">
          <span className="text-muted-foreground">Signer</span>
          <span className={hbSigner ? "font-bold" : "text-gray-400 font-normal"}>
            {hbSigner ? truncateAddress(hbSigner, 4) : "not set"}
          </span>
        </div>
      </div>

      {/* Tip */}
      <div className="mt-6 border-4 border-foreground rounded-[12px] bg-[#FEF9C3] p-4 text-sm leading-relaxed">
        <b className="block mb-1">💡 {TIP_TITLES[step]}</b>
        {TIPS[step]}
      </div>
    </div>
  );
};

export default SummaryColumn;
