import { CheckCircle } from "lucide-react";
import { SOL_DECIMALS, SECONDS_PER_DAY } from "@/lib/constants";
import { formatUiAmount, truncateAddress } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import type { TokenSelection } from "@/pages/CreateVault";
import { useTranslation } from "@heirloom/i18n";

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
  const { t } = useTranslation("app");
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
          <div className="text-xs font-bold uppercase tracking-[3px] text-accent-lime">{t("createVault.wizard.step4")}</div>
          <h3 className="text-2xl font-display">{t("createVault.wizard.reviewConfirm")}</h3>
        </div>
      </div>

      {/* Two-column grid: Timing + Deposits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Timing */}
        <div className="border-4 border-foreground rounded-[14px] p-5 bg-secondary/40">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">{t("createVault.wizard.timing")}</span>
            <button
              onClick={() => onEdit(2)}
              className="font-mono font-bold text-xs border-2 border-foreground rounded-full px-3.5 py-1 bg-background hover:bg-secondary transition-colors"
            >
              {t("createVault.wizard.edit")}
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">{t("createVault.wizard.interval")}</span>
              <span className="font-bold">{heartbeatDays} {t("createVault.wizard.daysShort")}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">{t("createVault.wizard.grace")}</span>
              <span className="font-bold">{graceDays} {t("createVault.wizard.daysShort")}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-t-2 border-foreground mt-2">
              <span className="text-muted-foreground">{t("createVault.wizard.total")}</span>
              <span className="font-bold">{totalDays} {t("createVault.wizard.daysShort")}</span>
            </div>
          </div>
        </div>

        {/* Deposits */}
        <div className="border-4 border-foreground rounded-[14px] p-5 bg-secondary/40">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">{t("createVault.wizard.deposits")}</span>
            <button
              onClick={() => onEdit(1)}
              className="font-mono font-bold text-xs border-2 border-foreground rounded-full px-3.5 py-1 bg-background hover:bg-secondary transition-colors"
            >
              {t("createVault.wizard.edit")}
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
              {t("createVault.wizard.noDeposits")}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2 border-t-2 border-dashed border-gray-200 pt-2">
            {t("createVault.wizard.assetTotal", { count: totalAssets })}
          </p>
        </div>
      </div>

      {/* Heir */}
      <div className="border-4 border-foreground rounded-[14px] p-5 bg-secondary/40 mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">{t("createVault.wizard.heir")}</span>
          <button
            onClick={() => onEdit(0)}
            className="font-mono font-bold text-xs border-2 border-foreground rounded-full px-3.5 py-1 bg-background hover:bg-secondary transition-colors"
          >
            {t("createVault.wizard.edit")}
          </button>
        </div>
        <p className="font-bold text-base">
          {label} · {truncateAddress(heirAddress, 4)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("createVault.wizard.allocation100")}
          {delegate && ` · ${t("createVault.wizard.guardianShort")} ${truncateAddress(delegate, 4)}`}
          {hbSigner && ` · ${t("createVault.wizard.signerShort")} ${truncateAddress(hbSigner, 4)}`}
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
          {t("createVault.wizard.ack", { days: totalDays, hb: heartbeatDays, grace: graceDays })}
        </span>
      </button>

      <p className="text-xs text-muted-foreground text-right mt-2">
        {t("createVault.wizard.estFee")}
      </p>
    </div>
  );
};

export default ReviewStep;