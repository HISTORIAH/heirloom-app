import { useEffect, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import TokenAvatar from "@/components/TokenAvatar";
import { COPIED_RESET_MS, SECONDS_PER_DAY, SOL_LABEL } from "@/lib/constants";
import { cn, formatUiAmount, truncateAddress } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import type { TokenSelection } from "@/pages/CreateVault";
import { useEstateDates } from "@/components/create-vault/estateTiming";
import { Trans, useTranslation } from "@heirloom/i18n";

/** Characters at each end of the heir address that are emphasised for comparing. */
const ADDRESS_ENDS = 4;

interface Props {
  heartbeatSeconds: number;
  graceSeconds: number;
  heirAddress: string;
  label: string;
  delegate: string;
  checkInSigner: string;
  solAmount: number;
  tokenSelections: Record<string, TokenSelection>;
  tokens: SplTokenAsset[] | undefined;
  acknowledged: boolean;
  setAcknowledged: (v: boolean) => void;
  onEdit: (stepIndex: number) => void;
  onEditExtraSafety: () => void;
}

const ReviewRow: React.FC<{
  label: string;
  editAria: string;
  onEdit: () => void;
  children: ReactNode;
}> = ({ label, editAria, onEdit, children }) => {
  const { t } = useTranslation("app");
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-tile-line py-[1.15rem] first:pt-0 last:border-b-0">
      <div className="min-w-0">
        <span className="mb-2 block font-mono text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        {children}
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={editAria}
        className="min-h-[2.75rem] self-start px-3 text-[0.92rem] font-semibold underline underline-offset-4 transition-colors hover:text-muted-foreground"
      >
        {t("createVault.wizard.edit")}
      </button>
    </div>
  );
};

/** The full heir address, with its first and last characters picked out for comparing. */
const HeirAddress: React.FC<{ address: string }> = ({ address }) => {
  const { t } = useTranslation("app");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
  };

  const ends = "font-bold text-foreground underline decoration-2 underline-offset-[3px]";
  return (
    <div className="flex flex-wrap items-center gap-[0.65rem]">
      <code className="min-w-0 break-all rounded-lg bg-tile-soft px-[0.65rem] py-2 font-mono text-[0.92rem] font-medium">
        <span className={ends}>{address.slice(0, ADDRESS_ENDS)}</span>
        <span className="text-muted-foreground">{address.slice(ADDRESS_ENDS, -ADDRESS_ENDS)}</span>
        <span className={ends}>{address.slice(-ADDRESS_ENDS)}</span>
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={t("createVault.review.copyAria")}
        className="rounded-md border border-tile-line px-[0.65rem] py-[0.45rem] font-mono text-[0.78rem] font-semibold transition-colors hover:bg-tile-soft"
      >
        {copied ? t("createVault.review.copied") : t("createVault.review.copy")}
      </button>
    </div>
  );
};

type AssetLine = {
  key: string;
  name: string;
  sub: string;
  amount: number;
  icon: ReactNode;
};

const ICON_CIRCLE =
  "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-tile-line bg-tile-soft font-mono text-[0.7rem] font-bold";

const ReviewStep: React.FC<Props> = ({
  heartbeatSeconds,
  graceSeconds,
  heirAddress,
  label,
  delegate,
  checkInSigner,
  solAmount,
  tokenSelections,
  tokens,
  acknowledged,
  setAcknowledged,
  onEdit,
  onEditExtraSafety,
}) => {
  const { t } = useTranslation("app");
  const date = useEstateDates();
  const selectedTokenEntries = Object.entries(tokenSelections).filter(([, v]) => v.amount > 0);
  const totalAssets = selectedTokenEntries.length + (solAmount > 0 ? 1 : 0);

  const heartbeatDays = Math.round(heartbeatSeconds / SECONDS_PER_DAY);
  const graceDays = Math.round(graceSeconds / SECONDS_PER_DAY);
  const totalDays = heartbeatDays + graceDays;
  const heir = heirAddress.trim();

  const intervalText =
    heartbeatDays === 365
      ? t("createVault.wizard.oneYearLong")
      : t("createVault.wizard.nDays", { count: heartbeatDays });
  const gracePeriod = t("createVault.review.gracePeriod", { count: graceDays });

  const assetsPhrase =
    totalAssets === 0
      ? t("createVault.wizard.whateverYouDeposit")
      : totalAssets === 1
        ? t("createVault.wizard.oneAsset")
        : t("createVault.wizard.nAssets", { count: totalAssets });

  const assetLines: AssetLine[] = [];
  if (solAmount > 0) {
    assetLines.push({
      key: "sol",
      name: SOL_LABEL,
      sub: t("createVault.review.solana"),
      amount: solAmount,
      icon: <span className={ICON_CIRCLE}>◎</span>,
    });
  }
  for (const [mint, sel] of selectedTokenEntries) {
    const tok = (tokens ?? []).find((item) => item.mint === mint);
    const known = tok?.symbol || tok?.name;
    assetLines.push({
      key: mint,
      name: known || t("createVault.review.unknownToken"),
      sub: truncateAddress(mint, 4),
      amount: sel.amount,
      icon: known ? (
        <TokenAvatar image={tok?.image} label={known} shape="round" />
      ) : (
        <span className={cn(ICON_CIRCLE, "border-dashed text-muted-foreground")}>?</span>
      ),
    });
  }

  const extras: string[] = [];
  if (checkInSigner.trim()) extras.push(t("createVault.wizard.checkInWalletSet"));
  if (delegate.trim()) extras.push(t("createVault.wizard.guardianSet"));

  return (
    <div>
      <h2 className="ed-h3 mb-5">{t("createVault.wizard.checkAndConfirm")}</h2>

      {/* Plain-language sentence */}
      <p className="mb-2 rounded-2xl bg-tile-soft px-[1.65rem] py-[1.4rem] text-[1.3rem] leading-relaxed tracking-tight">
        <Trans
          t={t}
          i18nKey="createVault.review.sentence"
          values={{ interval: intervalText, gracePeriod, assets: assetsPhrase, name: label }}
          components={{ b: <b className="font-semibold" /> }}
        />
      </p>

      <div className="mb-6">
        <ReviewRow
          label={t("createVault.wizard.heirEstateName")}
          editAria={t("createVault.wizard.editHeir")}
          onEdit={() => onEdit(0)}
        >
          <div className="mb-2 text-[1.05rem] font-semibold">
            {t("createVault.review.estateName", { name: label })}
          </div>
          <HeirAddress address={heir} />
          <p className="mt-2 text-[0.85rem] text-muted-foreground">
            {t("createVault.review.addressHint")}
          </p>
        </ReviewRow>

        <ReviewRow
          label={t("createVault.review.assetsCount", { count: totalAssets })}
          editAria={t("createVault.wizard.editAssets")}
          onEdit={() => onEdit(1)}
        >
          {assetLines.length > 0 ? (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-x-[1.15rem] gap-y-[0.4rem]">
              {assetLines.map((line) => (
                <li key={line.key} className="flex min-w-0 items-center gap-[0.65rem] py-[0.4rem]">
                  {line.icon}
                  <div className="min-w-0">
                    <div className="truncate text-[0.92rem] font-semibold">{line.name}</div>
                    <div className="truncate font-mono text-[0.78rem] text-muted-foreground">
                      {line.sub}
                    </div>
                  </div>
                  <span className="ml-auto font-mono text-[0.92rem] font-medium tabular-nums">
                    {formatUiAmount(line.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-sm font-semibold">{t("createVault.wizard.noneYetDeposit")}</span>
          )}
        </ReviewRow>

        <ReviewRow
          label={t("createVault.wizard.timingPlain")}
          editAria={t("createVault.wizard.editTiming")}
          onEdit={() => onEdit(2)}
        >
          <span className="block text-sm font-semibold">
            {t("createVault.review.timing", {
              interval: intervalText,
              gracePeriod,
              date: date.short(totalDays),
            })}
          </span>
        </ReviewRow>

        <ReviewRow
          label={t("createVault.wizard.extraSafetyPlain")}
          editAria={t("createVault.wizard.editExtraSafety")}
          onEdit={onEditExtraSafety}
        >
          <span className="block text-sm font-semibold">
            {extras.length > 0 ? extras.join(", ") : t("createVault.review.noExtraSafety")}
          </span>
        </ReviewRow>
      </div>

      {/* Consent */}
      <button
        type="button"
        onClick={() => setAcknowledged(!acknowledged)}
        aria-pressed={acknowledged}
        className={cn(
          "flex w-full items-start gap-3.5 rounded-xl border-[1.5px] p-4 text-left transition-colors",
          acknowledged ? "border-foreground" : "border-tile-line hover:bg-tile-soft",
        )}
      >
        <span
          className={cn(
            "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-[1.5px]",
            acknowledged
              ? "border-foreground bg-foreground text-background"
              : "border-foreground bg-background",
          )}
        >
          {acknowledged && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
        <span className="text-sm font-medium leading-relaxed">
          {t("createVault.wizard.consentText")}
        </span>
      </button>
    </div>
  );
};

export default ReviewStep;
