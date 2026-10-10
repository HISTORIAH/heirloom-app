import { SECONDS_PER_DAY } from "@/lib/constants";
import { cn, isValidSolanaAddress } from "@/lib/utils";
import { useEstateDates } from "@/components/create-vault/estateTiming";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  heartbeatSeconds: number;
  setHeartbeatSeconds: (n: number) => void;
  graceSeconds: number;
  setGraceSeconds: (n: number) => void;
  checkInSigner: string;
  setCheckinSigner: (s: string) => void;
  delegate: string;
  setDelegate: (s: string) => void;
  rolesOpen: boolean;
  setRolesOpen: (v: boolean) => void;
}

const INTERVAL_PRESETS = [30, 60, 90, 180, 365] as const;
const GRACE_PRESETS = [7, 14, 30, 60, 90] as const;

const HeartbeatStep: React.FC<Props> = ({
  heartbeatSeconds,
  setHeartbeatSeconds,
  graceSeconds,
  setGraceSeconds,
  checkInSigner,
  setCheckinSigner,
  delegate,
  setDelegate,
  rolesOpen,
  setRolesOpen,
}) => {
  const { t } = useTranslation("app");
  const date = useEstateDates();
  const heartbeatDays = Math.round(heartbeatSeconds / SECONDS_PER_DAY);
  const graceDays = Math.round(graceSeconds / SECONDS_PER_DAY);
  const totalDays = heartbeatDays + graceDays;

  const intervalText =
    heartbeatDays === 365
      ? t("createVault.wizard.oneYearLong")
      : t("createVault.wizard.nDays", { count: heartbeatDays });
  const graceText = t("createVault.wizard.nDays", { count: graceDays });

  // Bar widths: black (interval) then yellow (grace), yellow min 6%
  const gracePct = Math.max(6, Math.round((graceDays / totalDays) * 100));
  const intervalPct = 100 - gracePct;

  const signerTrimmed = checkInSigner.trim();
  const guardianTrimmed = delegate.trim();
  const signerValid = isValidSolanaAddress(signerTrimmed);
  const guardianValid = isValidSolanaAddress(guardianTrimmed);
  const sameKey =
    signerTrimmed.length > 0 && guardianTrimmed.length > 0 && signerTrimmed === guardianTrimmed;

  return (
    <div>
      <div className="mb-6">
        <h2 className="ed-h3">{t("createVault.wizard.whenHeirInherits")}</h2>
        <p className="ed-lede mt-2 text-muted-foreground">
          {t("createVault.wizard.whenHeirInheritsLede")}
        </p>
      </div>

      {/* Static timeline card */}
      <div className="mb-6 rounded-2xl border border-tile-line p-5">
        <div>
          <span className="block text-[0.8125rem] text-muted-foreground">
            {t("createVault.wizard.ifNeverCheckIn")}
          </span>
          <span className="mt-1 block font-display text-3xl font-bold tracking-tight">
            {date.long(totalDays)}
          </span>
        </div>

        {/* Bar */}
        <div className="mt-4 flex h-3.5 gap-[0.1875rem] overflow-hidden rounded-lg">
          <span className="rounded-l-lg bg-foreground" style={{ width: `${intervalPct}%` }} />
          <span className="rounded-r-lg bg-accent-yellow" style={{ width: `${gracePct}%` }} />
        </div>

        {/* Markers */}
        <div className="mt-3 grid grid-cols-3 gap-3 text-[0.8125rem]">
          <div>
            <span className="block text-muted-foreground">{t("createVault.wizard.today")}</span>
            <b>{date.short(0)}</b>
          </div>
          <div className="text-center">
            <span className="block text-muted-foreground">
              {t("createVault.wizard.missACheckIn")}
            </span>
            <b>{date.short(heartbeatDays)}</b>
            <span className="block text-muted-foreground">
              {t("createVault.wizard.graceStarts")}
            </span>
          </div>
          <div className="text-right">
            <span className="block text-muted-foreground">
              {t("createVault.wizard.estateOpens")}
            </span>
            <b>{date.short(totalDays)}</b>
            <span className="block text-muted-foreground">
              {t("createVault.wizard.heirNotifiedCanClaim")}
            </span>
          </div>
        </div>
      </div>

      {/* Interval chips */}
      <fieldset className="mb-5">
        <legend className="mb-2.5 text-sm font-semibold">
          {t("createVault.wizard.checkInAtLeastEvery")}{" "}
          <span className="font-mono">{intervalText}</span>
        </legend>
        <div className="grid grid-cols-5 gap-2">
          {INTERVAL_PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setHeartbeatSeconds(d * SECONDS_PER_DAY)}
              aria-pressed={heartbeatDays === d}
              className={cn(
                "min-h-[3rem] rounded-xl border-[1.5px] text-center text-sm font-semibold transition-colors",
                heartbeatDays === d
                  ? "border-foreground bg-foreground text-background"
                  : "border-tile-line bg-background hover:bg-tile-soft",
              )}
            >
              {d === 365
                ? t("createVault.wizard.oneYear")
                : t("createVault.wizard.nDaysShort", { count: d })}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t("createVault.wizard.intervalHint")}</p>
      </fieldset>

      {/* Grace chips */}
      <fieldset className="mb-6">
        <legend className="mb-2.5 text-sm font-semibold">
          {t("createVault.wizard.graceLegend")} <span className="font-mono">{graceText}</span>
        </legend>
        <div className="grid grid-cols-5 gap-2">
          {GRACE_PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setGraceSeconds(d * SECONDS_PER_DAY)}
              aria-pressed={graceDays === d}
              className={cn(
                "min-h-[3rem] rounded-xl border-[1.5px] text-center text-sm font-semibold transition-colors",
                graceDays === d
                  ? "border-foreground bg-foreground text-background"
                  : "border-tile-line bg-background hover:bg-tile-soft",
              )}
            >
              {t("createVault.wizard.nDaysShort", { count: d })}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t("createVault.wizard.graceHint")}</p>
      </fieldset>

      {/* Extra safety accordion */}
      <div className="rounded-2xl border border-tile-line">
        <button
          type="button"
          className="flex min-h-[4rem] w-full items-center justify-between gap-4 px-5 text-left"
          aria-expanded={rolesOpen}
          onClick={() => setRolesOpen(!rolesOpen)}
        >
          <span>
            <span className="block text-sm font-semibold">
              {t("createVault.wizard.extraSafety")}{" "}
              <span className="font-normal text-muted-foreground">
                · {t("createVault.wizard.optional")}
              </span>
            </span>
            <span className="block text-sm text-muted-foreground">
              {t("createVault.wizard.extraSafetyDesc")}
            </span>
          </span>
          <span className="text-xl leading-none">{rolesOpen ? "−" : "+"}</span>
        </button>

        {rolesOpen && (
          <div className="flex flex-col gap-5 px-5 pb-5">
            {/* Check-in wallet */}
            <div>
              <label className="ed-field-label" htmlFor="signer-address">
                {t("createVault.wizard.checkInWallet")}
              </label>
              <input
                id="signer-address"
                type="text"
                value={checkInSigner}
                onChange={(e) => setCheckinSigner(e.target.value)}
                maxLength={128}
                spellCheck={false}
                autoComplete="off"
                className={cn(
                  "ed-input mt-1.5 font-mono text-[0.8125rem]",
                  signerTrimmed.length > 0 && !signerValid && "border-accent-red",
                )}
                placeholder={t("createVault.wizard.checkInWalletPlaceholder")}
              />
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {t("createVault.wizard.checkInWalletHelp")}
              </p>
            </div>

            {/* Guardian */}
            <div>
              <label className="ed-field-label" htmlFor="guardian-address">
                {t("createVault.wizard.guardian")}
              </label>
              <input
                id="guardian-address"
                type="text"
                value={delegate}
                onChange={(e) => setDelegate(e.target.value)}
                maxLength={128}
                spellCheck={false}
                autoComplete="off"
                className={cn(
                  "ed-input mt-1.5 font-mono text-[0.8125rem]",
                  guardianTrimmed.length > 0 && !guardianValid && "border-accent-red",
                )}
                placeholder={t("createVault.wizard.guardianPlaceholder")}
              />
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {t("createVault.wizard.guardianHelp")}
              </p>
            </div>

            {sameKey && (
              <p role="alert" className="text-sm text-accent-red">
                {t("createVault.wizard.sameKeyError")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeartbeatStep;
