import { useState } from "react";
import { isAddress, type Address } from "@solana/kit";
import { useTranslation } from "@heirloom/i18n";
import { Panel } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
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
  owner: Address,
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
    <label htmlFor={id} className="ed-field-label block">
      {label}
    </label>
    <div className="flex items-center gap-2">
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={unit ? "numeric" : undefined}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={!!error}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`ed-input ${unit ? "w-28" : ""} ${mono ? "font-mono text-xs" : ""}`}
      />
      {unit && <span className="text-sm font-semibold text-muted-foreground">{unit}</span>}
    </div>
    {error ? (
      <p className="text-sm font-semibold text-accent-red">{error}</p>
    ) : (
      hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )
    )}
  </div>
);

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
    <div className="grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <TextField
          id={`${mode}-destination`}
          label={mode === "backup" ? t("planForm.recoveryWallet") : t("planForm.heir")}
          value={fields.destination}
          onChange={(v) => setField("destination", v)}
          error={errors.destination}
          mono
        />
      </div>
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
      <div className="md:col-span-2">
        <TextField
          id={`${mode}-checkin-signer`}
          label={t("planForm.checkinWallet")}
          hint={t("planForm.checkinWalletHint")}
          value={fields.checkinSigner}
          onChange={(v) => setField("checkinSigner", v)}
          error={errors.checkinSigner}
          mono
        />
      </div>
    </div>
  );
}

function useFields(initial: Fields) {
  const [fields, setFields] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const setField = (key: keyof Fields, value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  return { fields, setField, errors, setErrors };
}

/** Creates a backup plan or a vault. */
export const PlanForm: React.FC<{
  mode: PlanMode;
  owner: Address;
  pending: boolean;
  onSubmit: (input: PlanInput) => void;
}> = ({ mode, owner, pending, onSubmit }) => {
  const { t } = useTranslation("stocks");
  const { fields, setField, errors, setErrors } = useFields({
    destination: "",
    intervalDays: "30",
    graceDays: "7",
    deferDays: "7",
    guardian: "",
    checkinSigner: "",
  });

  return (
    <Panel tone="paper" className="max-w-3xl gap-6">
      <div>
        <h2 className="ed-h3">
          {mode === "backup" ? t("planForm.backupTitle") : t("planForm.vaultTitle")}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {mode === "backup" ? t("planForm.backupDescription") : t("planForm.vaultDescription")}
        </p>
      </div>
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          const { input, errors: found } = validate(fields, owner, t);
          setErrors(found);
          if (input) onSubmit(input);
        }}
      >
        <PlanFieldsView mode={mode} fields={fields} setField={setField} errors={errors} />
        <Button type="submit" variant="flat-yellow" disabled={pending}>
          {pending
            ? t("tx.signing")
            : mode === "backup"
              ? t("planForm.submitBackup")
              : t("planForm.submitVault")}
        </Button>
      </form>
    </Panel>
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
  const { fields, setField, errors, setErrors } = useFields({
    destination: plan.destination,
    intervalDays: toDays(plan.checkinIntervalSecs),
    graceDays: toDays(plan.gracePeriodSecs),
    deferDays: toDays(plan.pauseDurationSecs),
    guardian: plan.guardian ?? "",
    checkinSigner: plan.checkinSigner ?? "",
  });

  return (
    <Panel tone="paper" className="gap-6">
      <div>
        <h3 className="ed-h3">{t("settings.title")}</h3>
        <p className="mt-2 text-muted-foreground">{t("settings.description")}</p>
      </div>
      <form
        className="space-y-6"
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
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="flat" disabled={pending !== null}>
            {pending === "settings" ? t("tx.signing") : t("settings.save")}
          </Button>
          <Button
            type="button"
            variant="flat-outline"
            disabled={pending !== null || plan.coveredAssets > 0}
            onClick={onClose}
            title={t("settings.closeHint")}
          >
            {pending === "close" ? t("tx.signing") : t("settings.close")}
          </Button>
        </div>
      </form>
    </Panel>
  );
};
