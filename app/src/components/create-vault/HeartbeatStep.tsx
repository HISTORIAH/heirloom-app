import { SECONDS_PER_DAY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { StepHeader } from "@/components/create-vault/StepHeader";
import { EstateTimeline } from "@/components/create-vault/EstateTimeline";
import {
  useEstateDates,
  HB_MIN_DAYS,
  GRACE_MIN_DAYS,
} from "@/components/create-vault/estateTiming";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  heartbeatSeconds: number;
  setHeartbeatSeconds: (n: number) => void;
  graceSeconds: number;
  setGraceSeconds: (n: number) => void;
}

const HEARTBEAT_PRESETS = [30, 60, 90, 180, 365];
const GRACE_PRESETS = [7, 14, 30, 60, 90];

const HeartbeatStep: React.FC<Props> = ({
  heartbeatSeconds,
  setHeartbeatSeconds,
  graceSeconds,
  setGraceSeconds,
}) => {
  const { t } = useTranslation("app");
  const date = useEstateDates();
  const heartbeatDays = Math.max(HB_MIN_DAYS, Math.round(heartbeatSeconds / SECONDS_PER_DAY));
  const graceDays = Math.max(GRACE_MIN_DAYS, Math.round(graceSeconds / SECONDS_PER_DAY));
  const totalDays = heartbeatDays + graceDays;

  return (
    <div>
      <StepHeader
        cap={t("createVault.wizard.step03")}
        title={t("createVault.wizard.whenHeirInherits")}
      />

      <p className="ed-label">{t("createVault.wizard.ifNeverCheckIn")}</p>
      <p className="mt-1 font-display text-[clamp(1.75rem,4.5vw,2.75rem)] font-bold leading-[1.05] tracking-tight">
        {date.long(totalDays)}
      </p>
      <p className="mt-2.5 max-w-[48ch] text-sm text-muted-foreground">
        {t("createVault.wizard.dragToMove", { days: totalDays })}
      </p>

      <div className="mt-9">
        <EstateTimeline
          heartbeatDays={heartbeatDays}
          graceDays={graceDays}
          onHeartbeatChange={(d) => setHeartbeatSeconds(d * SECONDS_PER_DAY)}
          onGraceChange={(d) => setGraceSeconds(d * SECONDS_PER_DAY)}
        />
      </div>

      <div className="mt-9 grid gap-px overflow-hidden rounded-lg border border-tile-line bg-tile-line sm:grid-cols-2">
        <Readout
          label={t("createVault.wizard.youCheckInEvery")}
          value={heartbeatDays}
          daysLabel={t("createVault.wizard.nDaysInline", { count: heartbeatDays })}
          presets={HEARTBEAT_PRESETS}
          onPick={(d) => setHeartbeatSeconds(d * SECONDS_PER_DAY)}
          meta={t("createVault.wizard.heirNotifiedOn", { date: date.short(heartbeatDays) })}
          note={t("createVault.wizard.checkInFeeNote")}
        />
        <Readout
          label={t("createVault.wizard.heirThenWaits")}
          value={graceDays}
          daysLabel={t("createVault.wizard.nDaysInline", { count: graceDays })}
          presets={GRACE_PRESETS}
          onPick={(d) => setGraceSeconds(d * SECONDS_PER_DAY)}
          note={t("createVault.wizard.graceWaitNote")}
        />
      </div>
    </div>
  );
};

const Readout: React.FC<{
  label: string;
  value: number;
  daysLabel: string;
  presets: number[];
  onPick: (days: number) => void;
  /** The date this span lands on, when it isn't already the headline. */
  meta?: string;
  note: string;
}> = ({ label, value, daysLabel, presets, onPick, meta, note }) => (
  <div className="bg-background px-4 py-4">
    <span className="ed-field-label">{label}</span>
    <p className="mt-1.5 font-display text-2xl font-bold tabular-nums">{daysLabel}</p>
    {meta && <p className="mt-1 text-xs font-semibold tabular-nums">{meta}</p>}
    <div className="mt-3 flex flex-wrap gap-1.5">
      {presets.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          aria-pressed={value === p}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors",
            value === p
              ? "border-foreground bg-foreground text-background"
              : "border-tile-line hover:bg-tile-soft",
          )}
        >
          {p}
        </button>
      ))}
    </div>
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{note}</p>
  </div>
);

export default HeartbeatStep;
