import { Check, ClipboardCheck } from "lucide-react";
import StepHead from "@/components/create-vault/StepHead";
import { cn } from "@/lib/utils";
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
      <StepHead
        step={t("createVault.wizard.step4")}
        title={t("createVault.wizard.reviewConfirm")}
        icon={<ClipboardCheck strokeWidth={2} />}
      />

      {/* Three blocks of ruled rows — timing, deposits, heir — each with the
          one control that matters on a review screen: go back and change it. */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
        <section>
          <div className="flex items-center gap-3">
            <span className="cap">{t("createVault.wizard.timing")}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
            <button
              onClick={() => onEdit(2)}
              className="cap underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {t("createVault.wizard.edit")}
            </button>
          </div>
          <div className="mt-2">
            <div className="data-row">
              <span className="data-k">{t("createVault.wizard.interval")}</span>
              <span className="data-v tabular-nums">
                {heartbeatDays} {t("createVault.wizard.daysShort")}
              </span>
            </div>
            <div className="data-row">
              <span className="data-k">{t("createVault.wizard.grace")}</span>
              <span className="data-v tabular-nums">
                {graceDays} {t("createVault.wizard.daysShort")}
              </span>
            </div>
            <div className="data-row">
              <span className="data-k">{t("createVault.wizard.total")}</span>
              <span className="data-v tabular-nums">
                {totalDays} {t("createVault.wizard.daysShort")}
              </span>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3">
            <span className="cap">{t("createVault.wizard.deposits")}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
            <button
              onClick={() => onEdit(1)}
              className="cap underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {t("createVault.wizard.edit")}
            </button>
          </div>
          <div className="mt-2">
            {solAmount > 0 && (
              <div className="data-row">
                <span className="data-k">SOL</span>
                <span className="data-v tabular-nums">
                  {solAmount.toFixed(Math.min(6, SOL_DECIMALS))}
                </span>
              </div>
            )}
            {selectedTokenEntries.map(([mint, sel]) => {
              const tok = (tokens ?? []).find((t) => t.mint === mint);
              const tokLabel = tok?.symbol || tok?.label || mint.slice(0, 8);
              return (
                <div key={mint} className="data-row">
                  <span className="data-k">
                    {tokLabel}{" "}
                    <span className="text-xs">({truncateAddress(mint, 4)})</span>
                  </span>
                  <span className="data-v tabular-nums">{formatUiAmount(sel.amount)}</span>
                </div>
              );
            })}
            {totalAssets === 0 && (
              <p className="py-3 text-sm font-medium text-muted-foreground">
                {t("createVault.wizard.noDeposits")}
              </p>
            )}
            <p className="border-t border-tile-line pt-3 text-xs font-medium text-muted-foreground">
              {t("createVault.wizard.assetTotal", { count: totalAssets })}
            </p>
          </div>
        </section>

        <section className="md:col-span-2">
          <div className="flex items-center gap-3">
            <span className="cap">{t("createVault.wizard.heir")}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
            <button
              onClick={() => onEdit(0)}
              className="cap underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {t("createVault.wizard.edit")}
            </button>
          </div>
          <p className="mt-3 font-display text-lg font-semibold tracking-[-0.02em]">
            {label} · {truncateAddress(heirAddress, 4)}
          </p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {t("createVault.wizard.allocation100")}
            {delegate && ` · ${t("createVault.wizard.guardianShort")} ${truncateAddress(delegate, 4)}`}
            {hbSigner && ` · ${t("createVault.wizard.signerShort")} ${truncateAddress(hbSigner, 4)}`}
          </p>
        </section>
      </div>

      {/* The acknowledgement is the last thing between the reader and an
          on-chain estate, so it is a full-width control, not a footnote. */}
      <button
        onClick={() => setAcknowledged(!acknowledged)}
        aria-pressed={acknowledged}
        className={cn(
          "mt-8 flex w-full items-start gap-3.5 rounded-lg border p-4 text-left transition-colors",
          acknowledged
            ? "border-foreground bg-tile-soft"
            : "border-tile-line hover:border-foreground/40 hover:bg-tile-soft",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
            acknowledged ? "border-foreground bg-foreground text-background" : "border-tile-line",
          )}
        >
          {acknowledged && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
        <span className="text-sm font-medium leading-relaxed">
          {t("createVault.wizard.ack", { days: totalDays, hb: heartbeatDays, grace: graceDays })}
        </span>
      </button>

      <p className="mt-2.5 text-right text-xs font-medium text-muted-foreground">
        {t("createVault.wizard.estFee")}
      </p>
    </div>
  );
};

export default ReviewStep;
