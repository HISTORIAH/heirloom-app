import { useTranslation } from "@heirloom/i18n";
import type { CoverageHealth } from "@/services/coverage";
import type { MintDetails } from "@/services/mints";
import { planTimeline, type PlanPhase, type PlanView } from "@/services/plans";
import { riskFlags, type RiskFlag } from "@/services/risk";
import { formatDate, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "danger" | "quiet";

const HEALTH_TONE: Record<CoverageHealth, Tone> = {
  covered: "ok",
  evicted: "danger",
  frozen: "warn",
  paused: "warn",
  "hook-live": "warn",
  "clawback-added": "warn",
  closed: "quiet",
};

/** A state as a small pill; see `.hs-status` for the tones. */
export const Status: React.FC<{ tone: Tone; className?: string; children: React.ReactNode }> = ({
  tone,
  className,
  children,
}) => (
  <span data-tone={tone} className={cn("hs-status", className)}>
    {children}
  </span>
);

/** Coverage health as a pill, with its explanation when asked. */
export const HealthText: React.FC<{ health: CoverageHealth; withHint?: boolean }> = ({
  health,
  withHint = false,
}) => {
  const { t } = useTranslation("stocks");
  return (
    <div className="min-w-0">
      <Status tone={HEALTH_TONE[health]}>{t(`health.${health}.label`)}</Status>
      {withHint && health !== "covered" && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {t(`health.${health}.hint`)}
        </p>
      )}
    </div>
  );
};

/** What the issuer can still do to this mint, as small squared chips. */
export const RiskTags: React.FC<{ mint: MintDetails; className?: string }> = ({
  mint,
  className,
}) => <FlagTags flags={riskFlags(mint)} className={className} />;

/** The same chips for a known set of flags, where there is no live mint to read. */
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
          className="hs-chip"
          data-tone={flag === "paused" ? "warn" : undefined}
        >
          {t(`risk.${flag}.label`)}
        </li>
      ))}
    </ul>
  );
};

const PHASE_TONE: Record<PlanPhase, Tone> = {
  active: "ok",
  grace: "warn",
  recoverable: "danger",
};

const PHASE_FILL: Record<PlanPhase, string> = {
  active: "bg-[hsl(var(--hs-sage-line))]",
  grace: "bg-accent-orange",
  recoverable: "bg-[hsl(var(--hs-danger))]",
};

/**
 * Where a plan is in its check-in cycle: the phase, the next date that
 * matters, and the cycle drawn as a track from the last check-in to the
 * moment it becomes recoverable, with a notch where the grace period begins.
 */
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

  const start = plan.lastCheckinTs;
  const span = Math.max(1, timeline.recoverableAt - start);
  const at = (seconds: number) => Math.min(100, Math.max(0, ((seconds - start) / span) * 100));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Status tone={PHASE_TONE[timeline.phase]}>{t(`phase.${timeline.phase}`)}</Status>
        <p className="hs-h4">{next}</p>
      </div>
      <div>
        <div
          className="relative h-1.5 rounded-full bg-tile-line"
          role="img"
          aria-label={`${t("clock.lastCheckIn", { date: date(start) })} · ${next}`}
        >
          <span
            className={cn("absolute inset-y-0 left-0 rounded-full", PHASE_FILL[timeline.phase])}
            style={{ width: `${at(now)}%` }}
          />
          <span
            aria-hidden="true"
            className="absolute -top-1 h-3.5 w-px bg-foreground/45"
            style={{ left: `${at(timeline.graceStartsAt)}%` }}
          />
        </div>
        <div className="hs-mono-xs mt-2 flex justify-between gap-3 text-muted-foreground">
          <span>{t("clock.lastCheckIn", { date: formatShortDate(start, locale) })}</span>
          <span>{formatShortDate(timeline.recoverableAt, locale)}</span>
        </div>
      </div>
      {timeline.deferred && timeline.phase !== "recoverable" && (
        <p className="text-sm text-muted-foreground">
          {t("clock.deferred", { date: date(plan.pausedUntil) })}
        </p>
      )}
    </div>
  );
};
