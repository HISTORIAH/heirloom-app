import { Check } from "lucide-react";
import { SECONDS_PER_DAY } from "@/lib/constants";
import { cn, formatUiAmount, isValidSolanaAddress, truncateAddress } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import type { TokenSelection } from "@/pages/CreateVault";
import { useEstateDates } from "@/components/create-vault/estateTiming";
import { useTranslation } from "@heirloom/i18n";

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

  const heirValid = isValidSolanaAddress(heirAddress.trim());
  const head = heirValid ? heirAddress.trim().slice(0, 4) : "····";
  const tail = heirValid ? heirAddress.trim().slice(-4) : "····";

  const intervalText =
    heartbeatDays === 365
      ? t("createVault.wizard.oneYearLong")
      : t("createVault.wizard.nDays", { count: heartbeatDays });
  const graceText = t("createVault.wizard.nDays", { count: graceDays });

  const assetsPhrase =
    totalAssets === 0
      ? t("createVault.wizard.whateverYouDeposit")
      : totalAssets === 1
        ? t("createVault.wizard.oneAsset")
        : t("createVault.wizard.nAssets", { count: totalAssets });

  // Build asset list for review row
  const assetList: string[] = [];
  if (solAmount > 0) assetList.push(`${formatUiAmount(solAmount)} SOL`);
  for (const [mint, sel] of selectedTokenEntries) {
    const tok = (tokens ?? []).find((item) => item.mint === mint);
    assetList.push(
      `${formatUiAmount(sel.amount)} ${tok?.symbol || tok?.label || mint.slice(0, 8)}`,
    );
  }

  const extras: string[] = [];
  if (checkInSigner.trim()) extras.push(t("createVault.wizard.checkInWalletSet"));
  if (delegate.trim()) extras.push(t("createVault.wizard.guardianSet"));

  const reviewRows: { label: string; value: string; onEdit: () => void; editAria: string }[] = [
    {
      label: t("createVault.wizard.heirEstateName"),
      value: heirValid ? `${truncateAddress(heirAddress.trim(), 4)} · "${label}"` : `"${label}"`,
      onEdit: () => onEdit(0),
      editAria: t("createVault.wizard.editHeir"),
    },
    {
      label: t("createVault.wizard.assetsPlain"),
      value: assetList.length > 0 ? assetList.join(", ") : t("createVault.wizard.noneYetDeposit"),
      onEdit: () => onEdit(1),
      editAria: t("createVault.wizard.editAssets"),
    },
    {
      label: t("createVault.wizard.timingPlain"),
      value: t("createVault.wizard.checkInEveryNDays", {
        interval: intervalText,
        grace: graceText,
        date: date.short(totalDays),
      }),
      onEdit: () => onEdit(2),
      editAria: t("createVault.wizard.editTiming"),
    },
    {
      label: t("createVault.wizard.extraSafetyPlain"),
      value: extras.length > 0 ? extras.join(", ") : t("createVault.wizard.noneExtraSafety"),
      onEdit: onEditExtraSafety,
      editAria: t("createVault.wizard.editExtraSafety"),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="ed-h3">{t("createVault.wizard.checkAndConfirm")}</h2>
      </div>

      {/* Plain-language sentence */}
      <div className="mb-6 rounded-2xl bg-tile-soft p-7">
        <p className="text-[22px] leading-relaxed tracking-tight">
          {t("createVault.wizard.reviewSentence", {
            interval: intervalText,
            grace: graceText,
            heir: `${head}…${tail}`,
            assets: assetsPhrase,
          })}
        </p>
      </div>

      {/* Review rows */}
      <div className="mb-6">
        {reviewRows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-4 border-b border-tile-line py-4 first:pt-0 last:border-b-0"
          >
            <div className="min-w-0">
              <span className="block text-[13px] text-muted-foreground">{row.label}</span>
              <span className="block text-sm font-semibold break-words">{row.value}</span>
            </div>
            <button
              type="button"
              onClick={row.onEdit}
              aria-label={row.editAria}
              className="shrink-0 min-h-[44px] px-3 text-sm font-semibold underline underline-offset-4 transition-colors hover:text-muted-foreground"
            >
              {t("createVault.wizard.edit")}
            </button>
          </div>
        ))}
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
