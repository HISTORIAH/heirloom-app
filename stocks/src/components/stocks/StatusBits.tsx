import { useTranslation } from "@heirloom/i18n";
import type { CoverageHealth } from "@/services/coverage";
import type { MintDetails } from "@/services/mints";
import { planTimeline, type PlanView } from "@/services/plans";
import { riskFlags, type RiskFlag } from "@/services/risk";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const HEALTH_TONE: Record<CoverageHealth, string> = {
  covered: "text-foreground",
  evicted: "text-accent-red",
  frozen: "text-accent-orange",
  paused: "text-accent-orange",
  "hook-live": "text-accent-orange",
  "clawback-added": "text-accent-orange",
  closed: "text-muted-foreground",
};

const label = "text-[11px] font-bold uppercase tracking-[0.14em]";

/** Coverage health as a coloured label, with its explanation when asked. */
export const HealthText: React.FC<{ health: CoverageHealth; withHint?: boolean }> = ({
  health,
  withHint = false,
}) => {
  const { t } = useTranslation("stocks");
  return (
    <div className="min-w-0">
      <p className={cn(label, HEALTH_TONE[health])}>{t(`health.${health}.label`)}</p>
      {withHint && health !== "covered" && (
        <p className="mt-1 text-sm text-muted-foreground">{t(`health.${health}.hint`)}</p>
      )}
    </div>
  );
};

/** What the issuer can still do to this mint, as rectangular hairline tags. */
export const RiskTags: React.FC<{ mint: MintDetails; className?: string }> = ({
  mint,
  className,
}) => <FlagTags flags={riskFlags(mint)} className={className} />;

/** The same tags for a known set of flags, where there is no live mint to read. */
export const FlagTags: React.FC<{ flags: RiskFlag[]; className?: string }> = ({
  flags,
  className,
}) => {
  const { t } = useTranslation("stocks");
  if (flags.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {flags.map((flag) => (
        <li
          key={flag}
          title={t(`risk.${flag}.hint`)}
          className={cn(
            "rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
            flag === "paused" ? "border-accent-orange text-accent-orange" : "border-tile-line",
          )}
        >
          {t(`risk.${flag}.label`)}
        </li>
      ))}
    </ul>
  );
};

const PHASE_TONE = {
  active: "text-foreground",
  grace: "text-accent-orange",
  recoverable: "text-accent-red",
} as const;

/** Where a plan is in its check-in cycle, and the next date that matters. */
export const PlanClock: React.FC<{ plan: PlanView; now: number }> = ({ plan, now }) => {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const timeline = planTimeline(plan, now);
  const date = (seconds: number) => formatDate(seconds, locale);

  const next =
    timeline.phase === "active"
      ? t("clock.checkInBy", { date: date(timeline.graceStartsAt) })
      : timeline.phase === "grace"
        ? t("clock.recoverableFrom", { date: date(timeline.recoverableAt) })
        : t("clock.recoverableSince", { date: date(timeline.recoverableAt) });

  return (
    <div className="space-y-1">
      <p className={cn(label, PHASE_TONE[timeline.phase])}>{t(`phase.${timeline.phase}`)}</p>
      <p className="font-semibold">{next}</p>
      <p className="text-sm text-muted-foreground">
        {t("clock.lastCheckIn", { date: date(plan.lastCheckinTs) })}
      </p>
      {timeline.deferred && timeline.phase !== "recoverable" && (
        <p className="text-sm text-muted-foreground">
          {t("clock.deferred", { date: date(plan.pausedUntil) })}
        </p>
      )}
    </div>
  );
};
