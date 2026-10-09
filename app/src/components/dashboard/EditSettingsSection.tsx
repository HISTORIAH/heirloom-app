import { useState } from "react";
import { Modal } from "@/components/surface/Modal";
import {
  Callout,
  Chip,
  FieldLabel,
  FormButton,
  TxProgress,
  formInput,
} from "@/components/dashboard/modals/parts";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useTxFlow } from "@/hooks/useTxFlow";
import { useNow } from "@/hooks/useNow";
import {
  GRACE_PRESET_DAYS,
  INTERVAL_PRESET_DAYS,
  MAX_INTERVAL_SECS,
  NETWORK_FEE_LAMPORTS,
  PAUSE_PRESET_DAYS,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
} from "@/lib/constants";
import { cn, formatSol } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const UNITS = {
  hours: SECONDS_PER_HOUR,
  days: SECONDS_PER_DAY,
  weeks: SECONDS_PER_DAY * 7,
} as const;
type Unit = keyof typeof UNITS;

/** A duration as the user edits it: one of the preset chips, or a custom number and unit. */
type Duration = { custom: boolean; presetDays: number; n: number; unit: Unit };

const toSecs = (d: Duration) => (d.custom ? d.n * UNITS[d.unit] : d.presetDays * SECONDS_PER_DAY);

/** Opens on the chip that matches the current value, or on Custom in the largest whole unit. */
function fromSecs(secs: number, presets: number[]): Duration {
  const days = secs / SECONDS_PER_DAY;
  if (presets.includes(days)) return { custom: false, presetDays: days, n: days, unit: "days" };
  const unit: Unit = secs % UNITS.weeks === 0 ? "weeks" : secs % UNITS.days === 0 ? "days" : "hours";
  return {
    custom: true,
    presetDays: presets[1],
    n: Math.max(1, Math.round(secs / UNITS[unit])),
    unit,
  };
}

const DurationField: React.FC<{
  id: string;
  presets: number[];
  value: Duration;
  onChange: (d: Duration) => void;
}> = ({ id, presets, value, onChange }) => {
  const { t } = useTranslation("app");
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {presets.map((d) => (
          <Chip
            key={d}
            on={!value.custom && value.presetDays === d}
            onClick={() => onChange({ ...value, custom: false, presetDays: d })}
          >
            {t("schedule.days", { count: d })}
          </Chip>
        ))}
        <Chip on={value.custom} onClick={() => onChange({ ...value, custom: true })}>
          {t("schedule.custom")}
        </Chip>
      </div>
      {value.custom && (
        <div className="mt-2.5 flex gap-2">
          <input
            id={id}
            type="number"
            min={1}
            value={value.n || ""}
            onChange={(e) => onChange({ ...value, n: Number(e.target.value) })}
            className={cn(formInput, "w-[110px] tabular-nums")}
          />
          <select
            value={value.unit}
            onChange={(e) => onChange({ ...value, unit: e.target.value as Unit })}
            aria-label={t("schedule.unit")}
            className="rounded-xl border border-tile-line bg-background px-3 outline-hidden focus:border-foreground"
          >
            {(Object.keys(UNITS) as Unit[]).map((u) => (
              <option key={u} value={u}>
                {t(`schedule.unit_${u}`)}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
};

/** The check-in schedule: interval, grace period and guardian pause, in one transaction. */
const EditSettingsSection: React.FC<Props> = ({ estate, onTx }) => {
  const { t, i18n } = useTranslation("app");
  const { updateEstateFieldsOnChain } = useVault();
  const tx = useTxFlow();
  const now = useNow(60_000);

  const [open, setOpen] = useState(false);
  const [interval, setIntervalValue] = useState(() =>
    fromSecs(estate.checkInIntervalSecs, INTERVAL_PRESET_DAYS),
  );
  const [grace, setGrace] = useState(() => fromSecs(estate.gracePeriodSecs, GRACE_PRESET_DAYS));
  const [pauseSecs, setPauseSecs] = useState(estate.delegatePauseDurationSecs);

  const openModal = () => {
    setIntervalValue(fromSecs(estate.checkInIntervalSecs, INTERVAL_PRESET_DAYS));
    setGrace(fromSecs(estate.gracePeriodSecs, GRACE_PRESET_DAYS));
    setPauseSecs(estate.delegatePauseDurationSecs);
    tx.reset();
    setOpen(true);
  };

  const close = () => {
    if (!tx.busy) setOpen(false);
  };

  const intervalSecs = toSecs(interval);
  const graceSecs = toSecs(grace);
  const changed =
    intervalSecs !== estate.checkInIntervalSecs ||
    graceSecs !== estate.gracePeriodSecs ||
    pauseSecs !== estate.delegatePauseDurationSecs;
  const tooShort = intervalSecs <= 0 || graceSecs <= 0;
  const tooLong = intervalSecs > MAX_INTERVAL_SECS || graceSecs > MAX_INTERVAL_SECS;

  // Saving counts as a check-in on-chain (update_field sets last_check_in_ts), so the new
  // deadline runs from now.
  const due = new Date(now + intervalSecs * 1000);
  const claim = new Date(now + (intervalSecs + graceSecs) * 1000);
  const fmtDate = (d: Date) =>
    d.toLocaleDateString(i18n.language, { month: "short", day: "numeric", year: "numeric" });

  const pauseOptions = PAUSE_PRESET_DAYS.map((d) => d * SECONDS_PER_DAY);
  if (!pauseOptions.includes(estate.delegatePauseDurationSecs)) {
    pauseOptions.push(estate.delegatePauseDurationSecs);
  }

  const submit = () =>
    tx.run(async () => {
      const id = await updateEstateFieldsOnChain(estate.heir, {
        checkInIntervalSecs:
          intervalSecs !== estate.checkInIntervalSecs ? BigInt(intervalSecs) : undefined,
        gracePeriodSecs: graceSecs !== estate.gracePeriodSecs ? BigInt(graceSecs) : undefined,
        delegatePauseDurationSecs:
          pauseSecs !== estate.delegatePauseDurationSecs ? BigInt(pauseSecs) : undefined,
      });
      onTx(id);
      return id;
    });

  const primaryLabel = tooShort
    ? t("schedule.tooShort")
    : tooLong
      ? t("schedule.tooLong")
      : changed
        ? t("schedule.save")
        : t("schedule.noChanges");
  const inTx = tx.step !== "idle";

  return (
    <>
      <button
        onClick={openModal}
        className="w-full rounded-lg border border-tile-line px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-tile-soft"
      >
        {t("dashboard.manage.editSchedule")}
      </button>

      <Modal
        open={open}
        layout="form"
        cap={inTx ? t("tx.cap") : t("schedule.cap")}
        title={inTx ? t("schedule.txTitle") : t("schedule.title")}
        description={
          inTx ? (tx.step === "done" ? undefined : t("tx.keepOpen")) : t("schedule.subtitle")
        }
        busy={tx.busy}
        onClose={close}
        cost={
          inTx
            ? tx.busy
              ? t("tx.backgroundNote")
              : null
            : t("addAsset.costTopUp", { amount: formatSol(NETWORK_FEE_LAMPORTS, 6) })
        }
        footer={
          inTx ? (
            tx.step === "done" ? (
              <FormButton onClick={close}>{t("tx.doneButton")}</FormButton>
            ) : tx.step === "error" ? (
              <>
                <FormButton tone="secondary" onClick={close}>
                  {t("common.close")}
                </FormButton>
                <FormButton onClick={tx.reset}>{t("tx.tryAgain")}</FormButton>
              </>
            ) : null
          ) : (
            <>
              <FormButton tone="secondary" onClick={close}>
                {t("common.cancel")}
              </FormButton>
              <FormButton onClick={submit} disabled={!changed || tooShort || tooLong}>
                {primaryLabel}
              </FormButton>
            </>
          )
        }
      >
        {inTx ? (
          <TxProgress
            step={tx.step}
            txId={tx.txId}
            error={tx.error}
            doneTitle={t("schedule.doneTitle")}
            doneSummary={t("schedule.doneSummary", { date: fmtDate(due) })}
          />
        ) : (
          <>
            <div>
              <FieldLabel htmlFor="schedule-interval">{t("schedule.intervalLabel")}</FieldLabel>
              <DurationField
                id="schedule-interval"
                presets={INTERVAL_PRESET_DAYS}
                value={interval}
                onChange={setIntervalValue}
              />
            </div>

            <div>
              <FieldLabel htmlFor="schedule-grace" hint={t("schedule.graceHint")}>
                {t("schedule.graceLabel")}
              </FieldLabel>
              <DurationField
                id="schedule-grace"
                presets={GRACE_PRESET_DAYS}
                value={grace}
                onChange={setGrace}
              />
            </div>

            <div>
              <FieldLabel>{t("schedule.pauseLabel")}</FieldLabel>
              {estate.delegate ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {pauseOptions.map((secs) => (
                      <Chip key={secs} on={pauseSecs === secs} onClick={() => setPauseSecs(secs)}>
                        {secs === 0
                          ? t("schedule.off")
                          : t("schedule.days", { count: Math.round(secs / SECONDS_PER_DAY) })}
                      </Chip>
                    ))}
                  </div>
                  <p className="mt-2 text-[13px] text-muted-foreground">{t("schedule.pauseHint")}</p>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-tile-line px-4 py-3.5 text-sm text-muted-foreground">
                  {t("schedule.needsGuardian")}
                </div>
              )}
            </div>

            <Callout tone="info">
              {t("schedule.outcomeBefore")} <strong>{fmtDate(due)}</strong>
              {t("schedule.outcomeMiddle")} <strong>{fmtDate(claim)}</strong>
              {t("schedule.outcomeAfter")}
              <div className="mt-1 text-[13px] text-muted-foreground">
                {t("schedule.restartsTimer")}
              </div>
            </Callout>
          </>
        )}
      </Modal>
    </>
  );
};

export default EditSettingsSection;
