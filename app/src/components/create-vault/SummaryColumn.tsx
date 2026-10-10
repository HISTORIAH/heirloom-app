import { isValidSolanaAddress, truncateAddress } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import type { TokenSelection } from "@/pages/CreateVault";
import { useEstateDates } from "@/components/create-vault/estateTiming";
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
  checkInSigner: string;
}

/** Step index of the review step, which already lists everything the facts card repeats. */
const REVIEW_STEP = 3;

const SummaryColumn: React.FC<SummaryColumnProps> = ({
  step,
  heirAddress,
  solAmount,
  tokenSelections,
  intervalDays,
  graceDays,
}) => {
  const { t } = useTranslation("app");
  const date = useEstateDates();

  const trimmed = heirAddress.trim();
  const heirValid = isValidSolanaAddress(trimmed);
  const heirDisplay = heirValid ? truncateAddress(trimmed, 4) : t("createVault.wizard.notSet");

  const selectedEntries = Object.entries(tokenSelections).filter(([, v]) => v.amount > 0);
  const assetCount = selectedEntries.length + (solAmount > 0 ? 1 : 0);
  const countText =
    assetCount === 0
      ? t("createVault.wizard.nothingYet")
      : assetCount === 1
        ? t("createVault.wizard.oneAsset")
        : t("createVault.wizard.nAssets", { count: assetCount });

  const assetsPhrase = assetCount === 0 ? t("createVault.wizard.whateverYouDeposit") : countText;

  const intervalText =
    intervalDays === 365
      ? t("createVault.wizard.oneYearLong")
      : t("createVault.wizard.nDays", { count: intervalDays });
  const gracePeriod = t("createVault.review.gracePeriod", { count: graceDays });
  const totalDays = intervalDays + graceDays;

  const timelineItems = [
    {
      dotClass: "bg-foreground",
      title: t("createVault.wizard.youCheckIn"),
      body: t("createVault.wizard.youCheckInDesc", { interval: intervalText }),
      showLine: true,
    },
    {
      dotClass: "bg-accent-yellow",
      title: t("createVault.wizard.missOne", { date: date.short(intervalDays) }),
      body: t("createVault.review.missOneDesc", { gracePeriod }),
      showLine: true,
    },
    {
      dotClass: "bg-muted-foreground",
      title: t("createVault.wizard.estateOpensSidebar", {
        date: date.short(totalDays),
      }),
      body: t("createVault.wizard.estateOpensDesc", { assets: assetsPhrase }),
      showLine: false,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <span className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {t("createVault.wizard.whatHappens")}
      </span>

      {/* Timeline */}
      <div className="flex flex-col">
        {timelineItems.map((item, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex w-3 flex-col items-center">
              <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${item.dotClass}`} />
              {item.showLine && <span className="mt-1 w-0.5 flex-1 bg-tile-line" />}
            </div>
            <div className="pb-5">
              <b className="block text-sm">{item.title}</b>
              <span className="block text-sm text-muted-foreground">{item.body}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Facts card */}
      {step !== REVIEW_STEP && (
        <div className="flex flex-col gap-1.5 rounded-xl bg-background p-4 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t("createVault.wizard.heirPlain")}</span>
            <span className="font-mono font-semibold">{heirDisplay}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t("createVault.wizard.assetsPlain")}</span>
            <span>{countText}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t("createVault.wizard.checkInPlain")}</span>
            <span>{t("createVault.wizard.everyNDays", { count: intervalDays })}</span>
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("createVault.wizard.selfCustodial")}
      </p>
    </div>
  );
};

export default SummaryColumn;
