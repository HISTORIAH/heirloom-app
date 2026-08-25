import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  clampDays as clamp,
  horizonPct as pct,
  useEstateDates,
  HORIZON_DAYS,
  HB_MIN_DAYS,
  HB_MAX_DAYS,
  GRACE_MIN_DAYS,
  GRACE_MAX_DAYS,
} from "@/components/create-vault/estateTiming";
import { useTranslation } from "@heirloom/i18n";

/**
 * The spine of the wizard.
 *
 * The heartbeat step used to be two sliders with a number beside each, which is
 * the control you would build for a notification preference. But the owner is
 * not choosing two durations, they are placing two dates on their own calendar:
 * the day their heir is told something is wrong, and the day the estate opens.
 * Drawn as one rule, grace stops being a second number and becomes a visible
 * slice of time you can see yourself inside of.
 *
 * The rule is scaled to a fixed horizon rather than to the current total, so
 * dragging a handle moves that handle instead of silently rescaling the whole
 * diagram under both of them.
 */

interface EstateTimelineProps {
  heartbeatDays: number;
  graceDays: number;
  onHeartbeatChange: (days: number) => void;
  onGraceChange: (days: number) => void;
}

export const EstateTimeline: React.FC<EstateTimelineProps> = ({
  heartbeatDays,
  graceDays,
  onHeartbeatChange,
  onGraceChange,
}) => {
  const { t } = useTranslation("app");
  const date = useEstateDates();
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<null | "checkin" | "transfer">(null);
  const total = heartbeatDays + graceDays;

  useEffect(() => {
    if (!drag) return;

    const dayAt = (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return Math.round(clamp((clientX - r.left) / r.width, 0, 1) * HORIZON_DAYS);
    };

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      const day = dayAt(e.clientX);
      if (drag === "checkin") {
        onHeartbeatChange(clamp(day, HB_MIN_DAYS, HB_MAX_DAYS));
      } else {
        onGraceChange(clamp(day - heartbeatDays, GRACE_MIN_DAYS, GRACE_MAX_DAYS));
      }
    };
    const onUp = () => setDrag(null);

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, heartbeatDays, onHeartbeatChange, onGraceChange]);

  const nudge =
    (current: number, apply: (d: number) => void, lo: number, hi: number) =>
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        apply(clamp(current - step, lo, hi));
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        apply(clamp(current + step, lo, hi));
      } else if (e.key === "Home") {
        e.preventDefault();
        apply(lo);
      } else if (e.key === "End") {
        e.preventDefault();
        apply(hi);
      }
    };

  const handleClass = cn(
    "absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full",
    "border-[3px] border-background bg-foreground ring-1 ring-foreground",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
    drag ? "cursor-grabbing" : "cursor-grab",
  );

  const segment = drag ? "" : "transition-[left,width] duration-150";

  return (
    <div className="select-none">
      <div ref={trackRef} className="relative h-2 rounded-full bg-tile-soft">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-l-full bg-accent-sage", segment)}
          style={{ width: pct(heartbeatDays) }}
        />
        <div
          className={cn("absolute inset-y-0 bg-accent-yellow", segment)}
          style={{ left: pct(heartbeatDays), width: pct(graceDays) }}
        />

        <div
          role="slider"
          tabIndex={0}
          aria-label={t("createVault.wizard.ariaHeirNotified")}
          aria-valuemin={HB_MIN_DAYS}
          aria-valuemax={HB_MAX_DAYS}
          aria-valuenow={heartbeatDays}
          aria-valuetext={t("createVault.wizard.daysWithDate", {
            count: heartbeatDays,
            date: date.short(heartbeatDays),
          })}
          onPointerDown={() => setDrag("checkin")}
          onKeyDown={nudge(heartbeatDays, onHeartbeatChange, HB_MIN_DAYS, HB_MAX_DAYS)}
          style={{ left: pct(heartbeatDays) }}
          className={cn(handleClass, segment)}
        />
        <div
          role="slider"
          tabIndex={0}
          aria-label={t("createVault.wizard.ariaEstateOpens")}
          aria-valuemin={GRACE_MIN_DAYS}
          aria-valuemax={GRACE_MAX_DAYS}
          aria-valuenow={graceDays}
          aria-valuetext={t("createVault.wizard.daysAfterNotice", {
            count: graceDays,
            date: date.short(total),
          })}
          onPointerDown={() => setDrag("transfer")}
          onKeyDown={nudge(graceDays, onGraceChange, GRACE_MIN_DAYS, GRACE_MAX_DAYS)}
          style={{ left: pct(total) }}
          className={cn(handleClass, segment)}
        />
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-4">
        <span className="ed-label">{t("createVault.wizard.timelineToday")}</span>
        <span className="ed-label">{t("createVault.wizard.timelineHorizon")}</span>
      </div>
    </div>
  );
};

export const EstateTimelineMini: React.FC<{
  heartbeatDays: number;
  graceDays: number;
  /** Before the timing step is reached, show the rule unset. */
  pending?: boolean;
  className?: string;
}> = ({ heartbeatDays, graceDays, pending = false, className }) => {
  const { t } = useTranslation("app");
  const date = useEstateDates();
  const total = heartbeatDays + graceDays;

  return (
    <div className={className}>
      <div className="relative h-1.5 rounded-full bg-tile-soft">
        {!pending && (
          <>
            <div
              className="absolute inset-y-0 left-0 rounded-l-full bg-accent-sage"
              style={{ width: pct(heartbeatDays) }}
            />
            <div
              className="absolute inset-y-0 rounded-r-full bg-accent-yellow"
              style={{ left: pct(heartbeatDays), width: pct(graceDays) }}
            />
          </>
        )}
      </div>
      {pending ? (
        <p className="mt-2.5 text-sm text-muted-foreground">{t("createVault.wizard.timelinePending")}</p>
      ) : (
        <div className="mt-2.5 space-y-0.5">
          <p className="text-sm text-muted-foreground">
            {t("createVault.wizard.checkInEveryDays", { days: heartbeatDays })}
          </p>
          <p className="text-sm font-semibold tabular-nums">
            {t("createVault.wizard.estateOpensOn", {
              date: date.short(total),
              hb: heartbeatDays,
              grace: graceDays,
            })}
          </p>
        </div>
      )}
    </div>
  );
};
