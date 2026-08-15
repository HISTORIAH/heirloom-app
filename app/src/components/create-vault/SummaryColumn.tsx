import { truncateAddress, formatUiAmount } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import type { TokenSelection } from "@/pages/CreateVault";
import { useTranslation } from "@heirloom/i18n";

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
  const { t } = useTranslation("app");
  const displayLabel = label.trim() || t("createVault.wizard.heir");
  const selectedEntries = Object.entries(tokenSelections).filter(([, v]) => v.amount > 0);

  const TIPS = [
    t("createVault.wizard.tip1"),
    t("createVault.wizard.tip2"),
    t("createVault.wizard.tip3"),
    t("createVault.wizard.tip4"),
  ];
  const TIP_TITLES = [
    t("createVault.wizard.tip1Title"),
    t("createVault.wizard.tip2Title"),
    t("createVault.wizard.tip3Title"),
    t("createVault.wizard.tip4Title"),
  ];

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[3px] text-muted-foreground mb-5">
        {t("createVault.wizard.estateSoFar")}
      </div>

      {/* Heir preview */}
      <div className="bg-card border-4 border-foreground rounded-[14px] p-5 shadow-[5px_5px_0_0_hsl(var(--foreground))]">
        <div className="flex items-center gap-3.5 mb-2.5">
          <div className="w-11 h-11 rounded-[10px] bg-[hsl(var(--step-accent))] border-4 border-foreground flex items-center justify-center font-bold text-lg text-foreground shrink-0">
            {displayLabel.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-base">{displayLabel}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {heirAddress ? truncateAddress(heirAddress, 4) : t("createVault.wizard.noAddressYet")}
            </div>
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground">{t("createVault.wizard.allocation100Single")}</div>
      </div>

      {/* Assets */}
      <div className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground mt-6 mb-2.5">
        {t("createVault.wizard.assets")}
      </div>
      {solAmount <= 0 && selectedEntries.length === 0 ? (
        <div className="text-sm text-gray-400">{t("createVault.wizard.noneYet")}</div>
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
        {t("createVault.wizard.rules")}
      </div>
      <div className="space-y-0">
        <div className="flex justify-between items-baseline py-2 border-b-2 border-dashed border-gray-200 text-sm">
          <span className="text-muted-foreground">{t("createVault.wizard.interval")}</span>
          <span className={`font-bold ${step >= 2 ? "" : "text-gray-400 font-normal"}`}>
            {step >= 2 ? `${intervalDays} ${t("createVault.wizard.daysShort")}` : t("createVault.wizard.step3Placeholder")}
          </span>
        </div>
        <div className="flex justify-between items-baseline py-2 border-b-2 border-dashed border-gray-200 text-sm">
          <span className="text-muted-foreground">{t("createVault.wizard.grace")}</span>
          <span className={`font-bold ${step >= 2 ? "" : "text-gray-400 font-normal"}`}>
            {step >= 2 ? `${graceDays} ${t("createVault.wizard.daysShort")}` : t("createVault.wizard.step3Placeholder")}
          </span>
        </div>
        {step >= 2 && (
          <div className="flex justify-between items-baseline py-2 border-b-2 border-dashed border-gray-200 text-sm">
            <span className="text-muted-foreground">{t("createVault.wizard.total")}</span>
            <span className="font-bold">{totalDays} {t("createVault.wizard.daysShort")}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline py-2 border-b-2 border-dashed border-gray-200 text-sm">
          <span className="text-muted-foreground">{t("createVault.wizard.guardianShort")}</span>
          <span className={delegate ? "font-bold" : "text-gray-400 font-normal"}>
            {delegate ? truncateAddress(delegate, 4) : t("createVault.wizard.notSet")}
          </span>
        </div>
        <div className="flex justify-between items-baseline py-2 border-b-2 border-dashed border-gray-200 text-sm">
          <span className="text-muted-foreground">{t("createVault.wizard.signerShort")}</span>
          <span className={hbSigner ? "font-bold" : "text-gray-400 font-normal"}>
            {hbSigner ? truncateAddress(hbSigner, 4) : t("createVault.wizard.notSet")}
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