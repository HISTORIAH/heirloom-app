import { truncateAddress, formatUiAmount } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import type { TokenSelection } from "@/pages/CreateVault";
import { PanelCap } from "@/components/surface/Panel";
import { EstateTimelineMini } from "@/components/create-vault/EstateTimeline";
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
  delegate,
  hbSigner,
}) => {
  const { t } = useTranslation("app");
  const displayLabel = label.trim() || t("createVault.yourHeir");
  const selectedEntries = Object.entries(tokenSelections).filter(([, v]) => v.amount > 0);
  const tips = [
    {
      title: t("createVault.wizard.tipCheckAddressTitle"),
      body: t("createVault.wizard.tipCheckAddress"),
    },
    {
      title: t("createVault.wizard.tipAddLaterTitle"),
      body: t("createVault.wizard.tipAddLater"),
    },
    {
      title: t("createVault.wizard.tipKeepIntervalTitle"),
      body: t("createVault.wizard.tipKeepInterval"),
    },
    {
      title: t("createVault.wizard.tipStaysYoursTitle"),
      body: t("createVault.wizard.tipStaysYours"),
    },
  ];
  const tip = tips[step] ?? tips[0];

  return (
    <div className="flex flex-col gap-7 [--muted-foreground:0_0%_28%]">
      <PanelCap className="text-muted-foreground">{t("createVault.wizard.estateSoFarPlain")}</PanelCap>

      <section>
        <PanelCap className="block text-muted-foreground">{t("createVault.wizard.heirPlain")}</PanelCap>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-background text-sm font-semibold">
            {displayLabel.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayLabel}</p>
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
              {heirAddress ? truncateAddress(heirAddress, 4) : t("createVault.wizard.noAddressYetCap")}
            </p>
          </div>
        </div>
      </section>

      <section>
        <PanelCap className="block text-muted-foreground">{t("createVault.wizard.assetsPlain")}</PanelCap>
        {solAmount <= 0 && selectedEntries.length === 0 ? (
          <p className="mt-2.5 text-sm text-muted-foreground">{t("createVault.wizard.nothingAddedYet")}</p>
        ) : (
          <div className="mt-2.5 divide-y divide-tile-line border-y border-tile-line">
            {solAmount > 0 && (
              <div className="flex justify-between gap-3 py-2.5 text-sm">
                <span className="font-semibold">SOL</span>
                <span className="tabular-nums text-muted-foreground">{solAmount}</span>
              </div>
            )}
            {selectedEntries.map(([mint, sel]) => {
              const tok = (tokens ?? []).find((item) => item.mint === mint);
              if (!tok) return null;
              return (
                <div key={mint} className="flex justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate font-semibold">{tok.symbol || tok.label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatUiAmount(sel.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <PanelCap className="block text-muted-foreground">{t("createVault.wizard.timingPlain")}</PanelCap>
        <EstateTimelineMini
          className="mt-3"
          heartbeatDays={intervalDays}
          graceDays={graceDays}
          pending={step < 2}
        />
      </section>

      {(delegate || hbSigner) && (
        <section className="divide-y divide-tile-line border-y border-tile-line">
          {delegate && <Row label={t("createVault.wizard.guardianPlain")} value={truncateAddress(delegate, 4)} />}
          {hbSigner && <Row label={t("createVault.wizard.signerLabelPlain")} value={truncateAddress(hbSigner, 4)} />}
        </section>
      )}

      <div className="rounded-lg bg-accent-yellow/20 px-4 py-3.5">
        <p className="ed-label text-foreground/70">{tip.title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tip.body}</p>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-3 py-2.5">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="font-mono text-sm font-semibold">{value}</span>
  </div>
);

export default SummaryColumn;
