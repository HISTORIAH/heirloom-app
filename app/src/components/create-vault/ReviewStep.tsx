import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { SOL_DECIMALS, SECONDS_PER_DAY } from "@/lib/constants";
import { cn, formatUiAmount, truncateAddress } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import type { TokenSelection } from "@/pages/CreateVault";
import { StepHeader } from "@/components/create-vault/StepHeader";
import { EstateTimelineMini } from "@/components/create-vault/EstateTimeline";
import { useEstateDates } from "@/components/create-vault/estateTiming";
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
  const date = useEstateDates();
  const selectedTokenEntries = Object.entries(tokenSelections).filter(([, v]) => v.amount > 0);
  const totalAssets = selectedTokenEntries.length + (solAmount > 0 ? 1 : 0);

  const heartbeatDays = Math.round(heartbeatSeconds / SECONDS_PER_DAY);
  const graceDays = Math.round(graceSeconds / SECONDS_PER_DAY);
  const totalDays = heartbeatDays + graceDays;

  return (
    <div>
      <StepHeader cap={t("createVault.wizard.step04")} title={t("createVault.wizard.checkAndConfirm")} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="ed-label">{t("createVault.wizard.ifNeverCheckIn")}</p>
          <p className="mt-1 font-display text-[clamp(1.75rem,4.5vw,2.75rem)] font-bold leading-[1.05] tracking-tight">
            {date.long(totalDays)}
          </p>
        </div>
        <EditLink onClick={() => onEdit(2)} label={t("createVault.wizard.editTiming")} editLabel={t("createVault.wizard.edit")} />
      </div>
      <EstateTimelineMini className="mt-5" heartbeatDays={heartbeatDays} graceDays={graceDays} />

      <Section
        cap={t("createVault.wizard.heirPlain")}
        editAria={t("createVault.wizard.editHeir")}
        editLabel={t("createVault.wizard.edit")}
        onEdit={() => onEdit(0)}
      >
        <p className="text-sm font-semibold">
          {label || t("createVault.yourHeir")} · <span className="font-mono">{truncateAddress(heirAddress, 4)}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("createVault.wizard.inheritsWhole")}
          {delegate && t("createVault.wizard.guardianDot", { addr: truncateAddress(delegate, 4) })}
          {hbSigner && t("createVault.wizard.signerDot", { addr: truncateAddress(hbSigner, 4) })}
        </p>
      </Section>

      <Section
        cap={t("createVault.wizard.assetsPlain")}
        editAria={t("createVault.wizard.editAssets")}
        editLabel={t("createVault.wizard.edit")}
        onEdit={() => onEdit(1)}
      >
        {totalAssets === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("createVault.wizard.nothingDepositedLater")}
          </p>
        ) : (
          <div className="divide-y divide-tile-line">
            {solAmount > 0 && (
              <AssetRow name="SOL" amount={solAmount.toFixed(Math.min(6, SOL_DECIMALS))} />
            )}
            {selectedTokenEntries.map(([mint, sel]) => {
              const tok = (tokens ?? []).find((item) => item.mint === mint);
              return (
                <AssetRow
                  key={mint}
                  name={tok?.symbol || tok?.label || mint.slice(0, 8)}
                  mint={truncateAddress(mint, 4)}
                  amount={formatUiAmount(sel.amount)}
                />
              );
            })}
          </div>
        )}
      </Section>

      <button
        type="button"
        onClick={() => setAcknowledged(!acknowledged)}
        aria-pressed={acknowledged}
        className={cn(
          "mt-8 flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors",
          acknowledged ? "border-foreground bg-tile-soft" : "border-tile-line hover:bg-tile-soft",
        )}
      >
        <span
          className={cn(
            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border",
            acknowledged ? "border-foreground bg-foreground text-background" : "border-tile-line",
          )}
        >
          {acknowledged && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
        <span className="text-sm font-medium leading-relaxed">
          {t("createVault.wizard.ackNotify", { hb: heartbeatDays, grace: graceDays })}
        </span>
      </button>

      <p className="mt-3 text-right text-xs text-muted-foreground">
        {t("createVault.wizard.estFeeTilde")}
      </p>
    </div>
  );
};

const Section: React.FC<{
  cap: string;
  editAria: string;
  editLabel: string;
  onEdit: () => void;
  children: ReactNode;
}> = ({ cap, editAria, editLabel, onEdit, children }) => (
  <section className="mt-8 border-t border-tile-line pt-4">
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <span className="ed-label">{cap}</span>
      <EditLink onClick={onEdit} label={editAria} editLabel={editLabel} />
    </div>
    {children}
  </section>
);

const EditLink: React.FC<{ onClick: () => void; label: string; editLabel: string }> = ({
  onClick,
  label,
  editLabel,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
  >
    {editLabel}
  </button>
);

const AssetRow: React.FC<{ name: string; mint?: string; amount: string }> = ({
  name,
  mint,
  amount,
}) => (
  <div className="flex items-baseline justify-between gap-3 py-2">
    <span className="min-w-0 truncate text-sm font-semibold">
      {name}
      {mint && <span className="ml-2 font-mono text-xs text-muted-foreground">{mint}</span>}
    </span>
    <span className="shrink-0 text-sm font-semibold tabular-nums">{amount}</span>
  </div>
);

export default ReviewStep;
