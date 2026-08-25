import { Clock } from "lucide-react";
import StepHead from "@/components/create-vault/StepHead";
import { cn } from "@/lib/utils";
import { SECONDS_PER_DAY } from "@/lib/constants";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  heartbeatSeconds: number;
  setHeartbeatSeconds: (n: number) => void;
  graceSeconds: number;
  setGraceSeconds: (n: number) => void;
  assetCount: number;
}

const HeartbeatStep: React.FC<Props> = ({
  heartbeatSeconds,
  setHeartbeatSeconds,
  graceSeconds,
  setGraceSeconds,
  assetCount,
}) => {
  const { t, i18n } = useTranslation("app");
  const heartbeatDays = Math.max(30, Math.round(heartbeatSeconds / SECONDS_PER_DAY));
  const graceDays = Math.max(7, Math.round(graceSeconds / SECONDS_PER_DAY));
  const totalDays = heartbeatDays + graceDays;

  const HEARTBEAT_PRESETS = [30, 60, 90, 180, 365];
  const GRACE_PRESETS = [7, 30, 60, 90];

  const futureDate = (days: number) =>
    new Date(Date.now() + days * 864e5).toLocaleDateString(i18n.language, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div>
      <StepHead
        step={t("createVault.wizard.step3")}
        title={t("createVault.wizard.howOften")}
        icon={<Clock strokeWidth={2} />}
      />

      <p className="text-sm font-medium leading-relaxed text-muted-foreground">
        {t("createVault.wizard.youHave")}{" "}
        <strong className="font-semibold text-foreground">
          {assetCount || t("createVault.wizard.no")}{" "}
          {assetCount === 1 ? t("createVault.wizard.asset") : t("createVault.wizard.assets")}
        </strong>{" "}
        {t("createVault.wizard.and")}{" "}
        <strong className="font-semibold text-foreground">{t("createVault.wizard.oneHeir")}</strong>{" "}
        {t("createVault.wizard.chooseHowOften")}
      </p>

      {/* Two dials, each set as figure first: the number is the answer, the
          slider and the presets are only ways of changing it. */}
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
        {[
          {
            key: "interval",
            label: t("createVault.wizard.heartbeatInterval"),
            value: heartbeatDays,
            min: 30,
            max: 365,
            step: 5,
            presets: HEARTBEAT_PRESETS,
            set: (days: number) => setHeartbeatSeconds(days * SECONDS_PER_DAY),
          },
          {
            key: "grace",
            label: t("createVault.wizard.gracePeriod"),
            value: graceDays,
            min: 7,
            max: 90,
            step: 1,
            presets: GRACE_PRESETS,
            set: (days: number) => setGraceSeconds(days * SECONDS_PER_DAY),
          },
        ].map((dial) => (
          <div key={dial.key}>
            <label className="cap block">{dial.label}</label>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="num-xl">{dial.value}</span>
              <span className="cap">{t("createVault.wizard.days")}</span>
            </div>
            <input
              type="range"
              min={dial.min}
              max={dial.max}
              step={dial.step}
              value={dial.value}
              onChange={(e) => dial.set(Number(e.target.value))}
              aria-label={dial.label}
              className="mt-5 w-full"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {dial.presets.map((p) => (
                <button
                  key={p}
                  onClick={() => dial.set(p)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors",
                    dial.value === p
                      ? "border-foreground bg-foreground text-background"
                      : "border-tile-line bg-background hover:border-foreground/40 hover:bg-tile-soft",
                  )}
                >
                  {p}d
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* What the two dials add up to, in one sentence and one date. */}
      <div className="mt-8 border-t border-tile-line pt-5">
        <p className="text-sm font-medium leading-relaxed">
          <strong className="font-semibold">
            {t("createVault.wizard.totalDeadline", { days: totalDays })}
          </strong>{" "}
          {t("createVault.wizard.ifNoCheckin")}
        </p>
        <p className="mt-2 text-xs font-medium text-muted-foreground">
          {t("createVault.wizard.neverCheckin")}{" "}
          <strong className="font-semibold text-foreground">{futureDate(totalDays)}</strong>
        </p>
      </div>

      <div className="mt-5 rounded-lg border border-tile-line bg-tile-soft p-4 text-sm font-medium leading-relaxed">
        <strong className="font-semibold">{t("createVault.wizard.graceUndo")}</strong>{" "}
        {t("createVault.wizard.graceUndoDesc", { days: totalDays })}
      </div>
    </div>
  );
};

export default HeartbeatStep;
