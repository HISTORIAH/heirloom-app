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
      <p className="cap cap-ink">{t("createVault.wizard.estateSoFar")}</p>

      {/* Who it goes to. It sits directly on the rail and is ruled off like
          every other entry — as a white card floating on the soft ground it
          read as a component pasted in from another screen. The yellow mark is
          the only thing that separates a person from the numbers below. */}
      <div className="mt-4 flex items-center gap-3 border-b border-tile-line pb-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-yellow font-display text-sm font-semibold">
          {displayLabel.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{displayLabel}</span>
          <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
            {heirAddress ? truncateAddress(heirAddress, 4) : t("createVault.wizard.noAddressYet")}
          </span>
        </span>
      </div>
      <p className="mt-3 text-[11px] font-medium text-muted-foreground">
        {t("createVault.wizard.allocation100Single")}
      </p>

      <p className="cap mt-7">{t("createVault.wizard.assets")}</p>
      {solAmount <= 0 && selectedEntries.length === 0 ? (
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          {t("createVault.wizard.noneYet")}
        </p>
      ) : (
        <div className="mt-1">
          {solAmount > 0 && (
            <div className="data-row">
              <span className="data-k">SOL</span>
              <span className="data-v tabular-nums">{solAmount} SOL</span>
            </div>
          )}
          {selectedEntries.map(([mint, sel]) => {
            const tok = (tokens ?? []).find((t) => t.mint === mint);
            if (!tok) return null;
            return (
              <div key={mint} className="data-row">
                <span className="data-k">{tok.symbol || tok.label}</span>
                <span className="data-v tabular-nums">{formatUiAmount(sel.amount)}</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="cap mt-7">{t("createVault.wizard.rules")}</p>
      <div className="mt-1">
        <div className="data-row">
          <span className="data-k">{t("createVault.wizard.interval")}</span>
          <span className={step >= 2 ? "data-v tabular-nums" : "text-sm font-medium text-muted-foreground/60"}>
            {step >= 2
              ? `${intervalDays} ${t("createVault.wizard.daysShort")}`
              : t("createVault.wizard.step3Placeholder")}
          </span>
        </div>
        <div className="data-row">
          <span className="data-k">{t("createVault.wizard.grace")}</span>
          <span className={step >= 2 ? "data-v tabular-nums" : "text-sm font-medium text-muted-foreground/60"}>
            {step >= 2
              ? `${graceDays} ${t("createVault.wizard.daysShort")}`
              : t("createVault.wizard.step3Placeholder")}
          </span>
        </div>
        {step >= 2 && (
          <div className="data-row">
            <span className="data-k">{t("createVault.wizard.total")}</span>
            <span className="data-v tabular-nums">
              {totalDays} {t("createVault.wizard.daysShort")}
            </span>
          </div>
        )}
        <div className="data-row">
          <span className="data-k">{t("createVault.wizard.guardianShort")}</span>
          <span className={delegate ? "data-v font-mono text-xs" : "text-sm font-medium text-muted-foreground/60"}>
            {delegate ? truncateAddress(delegate, 4) : t("createVault.wizard.notSet")}
          </span>
        </div>
        <div className="data-row">
          <span className="data-k">{t("createVault.wizard.signerShort")}</span>
          <span className={hbSigner ? "data-v font-mono text-xs" : "text-sm font-medium text-muted-foreground/60"}>
            {hbSigner ? truncateAddress(hbSigner, 4) : t("createVault.wizard.notSet")}
          </span>
        </div>
      </div>

      {/* One tip per step, set as a note rather than as a coloured callout. */}
      <div className="mt-7 border-t border-tile-line pt-5">
        <p className="cap">{TIP_TITLES[step]}</p>
        <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">{TIPS[step]}</p>
      </div>
    </div>
  );
};

export default SummaryColumn;
