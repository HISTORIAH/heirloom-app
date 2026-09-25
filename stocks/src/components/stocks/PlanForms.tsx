import { useEffect, useId, useState } from "react";
import { isAddress, type Address } from "@solana/kit";
import { MAX_INTERVAL_SECONDS } from "@historiah/heirloom-stocks";
import { useTranslation } from "@heirloom/i18n";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IS_MAINNET } from "@/config";
import { useDraft, useResume } from "@/contexts/PageSession";
import { cn } from "@/lib/utils";
import type { PlanMode, PlanChanges, PlanTiming } from "@/lib/stocks";
import { formatNumber, SECONDS_PER_DAY } from "@/lib/format";
import { timedInSeconds, type PlanView } from "@/services/plans";

/** Timings are typed in days, or in seconds for the Seconds preset. */
type TimeUnit = "days" | "seconds";
const UNIT_SECONDS: Record<TimeUnit, number> = { days: SECONDS_PER_DAY, seconds: 1 };

interface Fields {
  destination: string;
  unit: TimeUnit;
  interval: string;
  grace: string;
  defer: string;
  guardian: string;
  checkinSigner: string;
}

type Timing = Pick<Fields, "unit" | "interval" | "grace" | "defer">;

/**
 * Timings a form can start from. Seconds lets a plan lapse and be recovered in
 * one sitting, so the whole flow can be tried end to end; it's offered only off
 * mainnet.
 */
const PRESETS = {
  standard: { unit: "days", interval: "30", grace: "7", defer: "7" },
  seconds: { unit: "seconds", interval: "30", grace: "15", defer: "15" },
} satisfies Record<string, Timing>;
type Preset = keyof typeof PRESETS;

export interface PlanInput extends PlanTiming {
  destination: Address;
  guardian?: Address;
  checkinSigner?: Address;
}

type FieldErrors = Partial<Record<keyof Fields, string>>;

function duration(text: string, unit: TimeUnit, min: number): bigint | null {
  const value = Number(text);
  if (!Number.isInteger(value) || value < min || value * UNIT_SECONDS[unit] > MAX_INTERVAL_SECONDS)
    return null;
  return BigInt(value * UNIT_SECONDS[unit]);
}

/** Checks the fields the way the program would, so a bad value never reaches a signature. */
function validate(
  fields: Fields,
  // Null before a wallet is connected: the one check that needs it waits.
  owner: Address | null,
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string,
): { input: PlanInput | null; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const address = (key: keyof Fields, required: boolean): Address | undefined => {
    const value = fields[key].trim();
    if (!value) {
      if (required) errors[key] = t("planForm.errors.address");
      return undefined;
    }
    if (!isAddress(value)) errors[key] = t("planForm.errors.address");
    else if (value === owner) errors[key] = t("planForm.errors.self");
    else return value;
    return undefined;
  };

  const destination = address("destination", true);
  const guardian = address("guardian", false);
  const checkinSigner = address("checkinSigner", false);

  const { unit } = fields;
  const range = (min: number) =>
    t("planForm.errors.range", {
      unit: t(`planForm.units.${unit}`),
      min,
      max: formatNumber(MAX_INTERVAL_SECONDS / UNIT_SECONDS[unit], locale),
    });
  const interval = duration(fields.interval, unit, 1);
  if (interval === null) errors.interval = range(1);
  const grace = duration(fields.grace, unit, 0);
  if (grace === null) errors.grace = range(0);
  const defer = duration(fields.defer, unit, 1);
  if (defer === null) errors.defer = range(1);

  if (Object.keys(errors).length > 0 || !destination) return { input: null, errors };
  return {
    input: {
      destination,
      guardian,
      checkinSigner,
      checkinIntervalSecs: interval!,
      gracePeriodSecs: grace!,
      pauseDurationSecs: defer!,
    },
    errors,
  };
}

const TextField: React.FC<{
  id: string;
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  mono?: boolean;
}> = ({ id, label, hint, error, value, onChange, unit, mono }) => (
  <div className="space-y-2">
    <label htmlFor={id} className="hs-label">
      {label}
    </label>
    <div className={cn("relative", unit && "max-w-[12rem]")}>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={unit ? "numeric" : undefined}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={!!error}
        aria-describedby={hint || error ? `${id}-note` : undefined}
        className={cn("hs-input", unit && "pr-16 tabular-nums", mono && "hs-input-mono")}
      />
      {unit && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
        >
          {unit}
        </span>
      )}
    </div>
    {error ? (
      <p id={`${id}-note`} className="hs-error">
        {error}
      </p>
    ) : (
      hint && (
        <p id={`${id}-note`} className="hs-hint">
          {hint}
        </p>
      )
    )}
  </div>
);

/** One band of a form: its name and a note on the left, its fields on the right. */
const Group: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({
  title,
  hint,
  children,
}) => {
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={id}
      className="grid gap-5 border-t border-tile-line px-6 py-7 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8 md:px-8"
    >
      <div>
        <h3 id={id} className="hs-h4">
          {title}
        </h3>
        {hint && <p className="hs-hint mt-1">{hint}</p>}
      </div>
      <div className="grid gap-5">{children}</div>
    </div>
  );
};

/** Picks a preset timing; neither is pressed once the numbers are edited by hand. */
function PresetPicker({
  fields,
  update,
}: {
  fields: Fields;
  update: (patch: Partial<Fields>) => void;
}) {
  const { t } = useTranslation("stocks");
  const id = useId();
  const current = (Object.keys(PRESETS) as Preset[]).find((p) =>
    (Object.keys(PRESETS[p]) as (keyof Timing)[]).every((k) => fields[k] === PRESETS[p][k]),
  );
  return (
    <div className="space-y-2">
      <span id={id} className="hs-label">
        {t("planForm.presets.label")}
      </span>
      <div role="group" aria-labelledby={id} className="hs-seg">
        {(Object.keys(PRESETS) as Preset[]).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={p === current}
            onClick={() => update(PRESETS[p])}
          >
            {t(`planForm.presets.${p}`)}
          </button>
        ))}
      </div>
      <p className="hs-hint">{t("planForm.presets.hint")}</p>
    </div>
  );
}

function PlanFieldsView({
  mode,
  fields,
  update,
  errors,
}: {
  mode: PlanMode;
  fields: Fields;
  update: (patch: Partial<Fields>) => void;
  errors: FieldErrors;
}) {
  const { t } = useTranslation("stocks");
  const unit = t(`planForm.units.${fields.unit}`);
  return (
    <>
      <Group title={t("planForm.groups.recipient")}>
        <TextField
          id={`${mode}-destination`}
          label={mode === "backup" ? t("planForm.recoveryWallet") : t("planForm.heir")}
          value={fields.destination}
          onChange={(v) => update({ destination: v })}
          error={errors.destination}
          mono
        />
      </Group>
      <Group title={t("planForm.groups.timing")} hint={t("planForm.groups.timingHint")}>
        {!IS_MAINNET && <PresetPicker fields={fields} update={update} />}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id={`${mode}-interval`}
            label={t("planForm.interval")}
            hint={t("planForm.intervalHint")}
            value={fields.interval}
            onChange={(v) => update({ interval: v })}
            error={errors.interval}
            unit={unit}
          />
          <TextField
            id={`${mode}-grace`}
            label={t("planForm.grace")}
            hint={t("planForm.graceHint")}
            value={fields.grace}
            onChange={(v) => update({ grace: v })}
            error={errors.grace}
            unit={unit}
          />
        </div>
      </Group>
      <Group title={t("planForm.groups.helpers")} hint={t("planForm.groups.helpersHint")}>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <TextField
            id={`${mode}-guardian`}
            label={t("planForm.guardian")}
            hint={t("planForm.guardianHint")}
            value={fields.guardian}
            onChange={(v) => update({ guardian: v })}
            error={errors.guardian}
            mono
          />
          <TextField
            id={`${mode}-defer`}
            label={t("planForm.defer")}
            value={fields.defer}
            onChange={(v) => update({ defer: v })}
            error={errors.defer}
            unit={unit}
          />
        </div>
        <TextField
          id={`${mode}-checkin-signer`}
          label={t("planForm.checkinWallet")}
          hint={t("planForm.checkinWalletHint")}
          value={fields.checkinSigner}
          onChange={(v) => update({ checkinSigner: v })}
          error={errors.checkinSigner}
          mono
        />
      </Group>
    </>
  );
}

/** The band a form ends on: its actions on the soft fill, with a note beside them. */
const FormFooter: React.FC<{ note?: string; children: React.ReactNode }> = ({
  note,
  children,
}) => (
  <div className="flex flex-col gap-4 rounded-b-[var(--hs-radius)] border-t border-tile-line bg-tile-soft px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
    <div className="flex flex-wrap gap-2.5">{children}</div>
    {note && <p className="hs-mono-xs text-muted-foreground md:text-right">{note}</p>}
  </div>
);

/** Edits a set of fields held wherever the caller keeps them. */
function useFieldEditor([fields, setFields]: [
  Fields,
  React.Dispatch<React.SetStateAction<Fields>>,
]) {
  const [errors, setErrors] = useState<FieldErrors>({});
  /** Changes some fields and clears their errors. */
  const update = (patch: Partial<Fields>) => {
    setFields((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch)) delete next[key as keyof Fields];
      return next;
    });
  };
  return { fields, update, errors, setErrors };
}

/** Creates a backup plan or a vault. */
const EMPTY_FIELDS: Fields = {
  destination: "",
  ...PRESETS.standard,
  guardian: "",
  checkinSigner: "",
};

/**
 * Creates a backup plan or a vault. It renders without a wallet (`owner`
 * null), so a visitor can read and fill it first; the page asks for a wallet
 * when it's submitted. The fields are a page draft, so they survive the page
 * body remounting on connect, and `resumeKey` lets the connected form submit
 * itself once, carrying on the action that asked for the wallet.
 */
export const PlanForm: React.FC<{
  mode: PlanMode;
  owner: Address | null;
  pending: boolean;
  onSubmit: (input: PlanInput) => void;
  resumeKey?: string;
}> = ({ mode, owner, pending, onSubmit, resumeKey }) => {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const { fields, update, errors, setErrors } = useFieldEditor(
    useDraft(`plan-form-${mode}`, EMPTY_FIELDS),
  );
  const submit = () => {
    const { input, errors: found } = validate(fields, owner, t, locale);
    setErrors(found);
    if (input) onSubmit(input);
  };

  const resumed = useResume(resumeKey ?? "", !!resumeKey && owner !== null);
  useEffect(() => {
    if (resumed) submit();
    // Only the resume itself should trigger this; `submit` reads the fields
    // as they are when it runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumed]);

  return (
    <form
      className="hs-sheet"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="max-w-[40rem] px-6 py-7 md:px-8 md:py-8">
        <h2 className="hs-h3">
          {mode === "backup" ? t("planForm.backupTitle") : t("planForm.vaultTitle")}
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
          {mode === "backup" ? t("planForm.backupDescription") : t("planForm.vaultDescription")}
        </p>
      </div>
      <PlanFieldsView mode={mode} fields={fields} update={update} errors={errors} />
      <FormFooter
        note={
          owner === null
            ? t(mode === "backup" ? "planForm.connectNote" : "planForm.connectVaultNote")
            : t(mode === "backup" ? "planForm.backupNote" : "planForm.vaultNote")
        }
      >
        <Button type="submit" variant="primary" disabled={pending}>
          {pending
            ? t("tx.signing")
            : mode === "backup"
              ? t("planForm.submitBackup")
              : t("planForm.submitVault")}
        </Button>
      </FormFooter>
    </form>
  );
};

/** A live plan's timings as the form shows them: in days, unless one isn't a whole number of them. */
function planTiming(plan: PlanView): Timing {
  const unit: TimeUnit = timedInSeconds(plan) ? "seconds" : "days";
  const show = (seconds: number) => String(seconds / UNIT_SECONDS[unit]);
  return {
    unit,
    interval: show(plan.checkinIntervalSecs),
    grace: show(plan.gracePeriodSecs),
    defer: show(plan.pauseDurationSecs),
  };
}

/**
 * Edits a live plan. Only the fields that changed are sent, and clearing an
 * optional wallet removes it from the plan.
 */
export const PlanSettings: React.FC<{
  plan: PlanView;
  pending: string | null;
  onSave: (changes: PlanChanges) => void;
  onClose: () => void;
}> = ({ plan, pending, onSave, onClose }) => {
  const { t, i18n } = useTranslation("stocks");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const { fields, update, errors, setErrors } = useFieldEditor(
    useState<Fields>({
      destination: plan.destination,
      ...planTiming(plan),
      guardian: plan.guardian ?? "",
      checkinSigner: plan.checkinSigner ?? "",
    }),
  );

  const [open, setOpen] = useState(false);

  return (
    <section className="hs-sheet">
      {/* Settings are rarely changed, so they wait behind their heading. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${plan.mode}-settings`}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-6 rounded-[var(--hs-radius)] px-6 py-6 text-left transition-colors duration-100 ease-out hover:bg-tile-soft/60 md:px-8"
      >
        <span>
          <span className="hs-h3 block">{t("settings.title")}</span>
          <span className="mt-1.5 block text-[0.9375rem] text-muted-foreground">
            {t("settings.description")}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-5 w-5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <form
          id={`${plan.mode}-settings`}
          className="hs-rise"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const { input, errors: found } = validate(fields, plan.owner, t, locale);
            setErrors(found);
            if (!input) return;
            const changes: PlanChanges = {};
            if (input.destination !== plan.destination) changes.destination = input.destination;
            if (Number(input.checkinIntervalSecs) !== plan.checkinIntervalSecs) {
              changes.checkinIntervalSecs = input.checkinIntervalSecs;
            }
            if (Number(input.gracePeriodSecs) !== plan.gracePeriodSecs) {
              changes.gracePeriodSecs = input.gracePeriodSecs;
            }
            if (Number(input.pauseDurationSecs) !== plan.pauseDurationSecs) {
              changes.pauseDurationSecs = input.pauseDurationSecs;
            }
            if ((input.guardian ?? null) !== plan.guardian) {
              if (input.guardian) changes.guardian = input.guardian;
              else changes.clearGuardian = true;
            }
            if ((input.checkinSigner ?? null) !== plan.checkinSigner) {
              if (input.checkinSigner) changes.checkinSigner = input.checkinSigner;
              else changes.clearCheckinSigner = true;
            }
            if (Object.keys(changes).length > 0) onSave(changes);
          }}
        >
          <PlanFieldsView mode={plan.mode} fields={fields} update={update} errors={errors} />
          <FormFooter note={t("settings.closeHint")}>
            <Button type="submit" variant="ink" disabled={pending !== null}>
              {pending === "settings" ? t("tx.signing") : t("settings.save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending !== null || plan.coveredAssets > 0}
              onClick={onClose}
            >
              {pending === "close" ? t("tx.signing") : t("settings.close")}
            </Button>
          </FormFooter>
        </form>
      )}
    </section>
  );
};
