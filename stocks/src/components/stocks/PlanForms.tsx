import { useEffect, useId, useState } from "react";
import { isAddress, type Address } from "@solana/kit";
import { useTranslation } from "@heirloom/i18n";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDraft, useResume } from "@/contexts/PageSession";
import { cn } from "@/lib/utils";
import type { PlanMode, PlanChanges, PlanTiming } from "@/lib/stocks";
import { SECONDS_PER_DAY } from "@/lib/format";
import type { PlanView } from "@/services/plans";

/** 365 days, the program's `MAX_INTERVAL_SECONDS`. */
const MAX_DAYS = 365;

interface Fields {
  destination: string;
  intervalDays: string;
  graceDays: string;
  deferDays: string;
  guardian: string;
  checkinSigner: string;
}

export interface PlanInput extends PlanTiming {
  destination: Address;
  guardian?: Address;
  checkinSigner?: Address;
}

type FieldErrors = Partial<Record<keyof Fields, string>>;

function days(text: string, min: number): bigint | null {
  const value = Number(text);
  if (!Number.isInteger(value) || value < min || value > MAX_DAYS) return null;
  return BigInt(value * SECONDS_PER_DAY);
}

/** Checks the fields the way the program would, so a bad value never reaches a signature. */
function validate(
  fields: Fields,
  // Null before a wallet is connected: the one check that needs it waits.
  owner: Address | null,
  t: (key: string, options?: Record<string, unknown>) => string,
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

  const interval = days(fields.intervalDays, 1);
  if (interval === null)
    errors.intervalDays = t("planForm.errors.range", { min: 1, max: MAX_DAYS });
  const grace = days(fields.graceDays, 0);
  if (grace === null) errors.graceDays = t("planForm.errors.range", { min: 0, max: MAX_DAYS });
  const defer = days(fields.deferDays, 1);
  if (defer === null) errors.deferDays = t("planForm.errors.range", { min: 1, max: MAX_DAYS });

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

function PlanFieldsView({
  mode,
  fields,
  setField,
  errors,
}: {
  mode: PlanMode;
  fields: Fields;
  setField: (key: keyof Fields, value: string) => void;
  errors: FieldErrors;
}) {
  const { t } = useTranslation("stocks");
  const unit = t("planForm.unit");
  return (
    <>
      <Group title={t("planForm.groups.recipient")}>
        <TextField
          id={`${mode}-destination`}
          label={mode === "backup" ? t("planForm.recoveryWallet") : t("planForm.heir")}
          value={fields.destination}
          onChange={(v) => setField("destination", v)}
          error={errors.destination}
          mono
        />
      </Group>
      <Group title={t("planForm.groups.timing")} hint={t("planForm.groups.timingHint")}>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id={`${mode}-interval`}
            label={t("planForm.interval")}
            hint={t("planForm.intervalHint")}
            value={fields.intervalDays}
            onChange={(v) => setField("intervalDays", v)}
            error={errors.intervalDays}
            unit={unit}
          />
          <TextField
            id={`${mode}-grace`}
            label={t("planForm.grace")}
            hint={t("planForm.graceHint")}
            value={fields.graceDays}
            onChange={(v) => setField("graceDays", v)}
            error={errors.graceDays}
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
            onChange={(v) => setField("guardian", v)}
            error={errors.guardian}
            mono
          />
          <TextField
            id={`${mode}-defer`}
            label={t("planForm.defer")}
            value={fields.deferDays}
            onChange={(v) => setField("deferDays", v)}
            error={errors.deferDays}
            unit={unit}
          />
        </div>
        <TextField
          id={`${mode}-checkin-signer`}
          label={t("planForm.checkinWallet")}
          hint={t("planForm.checkinWalletHint")}
          value={fields.checkinSigner}
          onChange={(v) => setField("checkinSigner", v)}
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
  const setField = (key: keyof Fields, value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  return { fields, setField, errors, setErrors };
}

/** Creates a backup plan or a vault. */
const EMPTY_FIELDS: Fields = {
  destination: "",
  intervalDays: "30",
  graceDays: "7",
  deferDays: "7",
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
  const { t } = useTranslation("stocks");
  const { fields, setField, errors, setErrors } = useFieldEditor(
    useDraft(`plan-form-${mode}`, EMPTY_FIELDS),
  );
  const submit = () => {
    const { input, errors: found } = validate(fields, owner, t);
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
      <PlanFieldsView mode={mode} fields={fields} setField={setField} errors={errors} />
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

const toDays = (seconds: number) => String(Math.round(seconds / SECONDS_PER_DAY));

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
  const { t } = useTranslation("stocks");
  const { fields, setField, errors, setErrors } = useFieldEditor(
    useState<Fields>({
      destination: plan.destination,
      intervalDays: toDays(plan.checkinIntervalSecs),
      graceDays: toDays(plan.gracePeriodSecs),
      deferDays: toDays(plan.pauseDurationSecs),
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
            const { input, errors: found } = validate(fields, plan.owner, t);
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
          <PlanFieldsView mode={plan.mode} fields={fields} setField={setField} errors={errors} />
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
