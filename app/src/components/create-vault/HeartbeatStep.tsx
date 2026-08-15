import { Clock } from "lucide-react";
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
  const { t } = useTranslation("app");
  const heartbeatDays = Math.max(30, Math.round(heartbeatSeconds / SECONDS_PER_DAY));
  const graceDays = Math.max(7, Math.round(graceSeconds / SECONDS_PER_DAY));
  const totalDays = heartbeatDays + graceDays;

  const HEARTBEAT_PRESETS = [30, 60, 90, 180, 365];
  const GRACE_PRESETS = [7, 30, 60, 90];

  const futureDate = (days: number) =>
    new Date(Date.now() + days * 864e5).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div>
      {/* Step header */}
      <div className="flex items-center gap-4 mb-5">
        <div className="bg-accent-cyan border-4 border-foreground rounded-xl p-3.5 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
          <Clock className="h-5 w-5" strokeWidth={2} />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[3px] text-accent-cyan">{t("createVault.wizard.step3")}</div>
          <h3 className="text-2xl font-display">{t("createVault.wizard.howOften")}</h3>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        {t("createVault.wizard.youHave")} <strong>{assetCount || t("createVault.wizard.no")} {assetCount === 1 ? t("createVault.wizard.asset") : t("createVault.wizard.assets")}</strong> {t("createVault.wizard.and")}{" "}
        <strong>{t("createVault.wizard.oneHeir")}</strong> {t("createVault.wizard.chooseHowOften")}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mb-6">
        {/* Heartbeat Interval */}
        <div>
          <label className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground block mb-4">
            {t("createVault.wizard.heartbeatInterval")}
          </label>
          <input
            type="range"
            min={30}
            max={365}
            step={5}
            value={heartbeatDays}
            onChange={(e) => setHeartbeatSeconds(Number(e.target.value) * SECONDS_PER_DAY)}
            className="w-full h-3 bg-secondary border-4 border-foreground rounded-full appearance-none cursor-pointer mb-5 focus:outline-none"
            style={{ accentColor: "hsl(var(--step-accent))" }}
          />
          <div className="flex items-baseline gap-2 mb-3.5">
            <span className="text-5xl font-display font-bold tabular-nums leading-none">{heartbeatDays}</span>
            <span className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">{t("createVault.wizard.days")}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {HEARTBEAT_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setHeartbeatSeconds(p * SECONDS_PER_DAY)}
                className={`border-4 border-foreground rounded-lg px-3.5 py-1.5 text-sm font-bold transition-all duration-150 ${
                  heartbeatDays === p
                    ? "bg-[hsl(var(--step-accent))] shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                    : "bg-secondary hover:bg-[hsl(var(--step-accent)/0.4)]"
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>

        {/* Grace Period */}
        <div>
          <label className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground block mb-4">
            {t("createVault.wizard.gracePeriod")}
          </label>
          <input
            type="range"
            min={7}
            max={90}
            step={1}
            value={graceDays}
            onChange={(e) => setGraceSeconds(Number(e.target.value) * SECONDS_PER_DAY)}
            className="w-full h-3 bg-secondary border-4 border-foreground rounded-full appearance-none cursor-pointer mb-5 focus:outline-none"
            style={{ accentColor: "hsl(var(--step-accent))" }}
          />
          <div className="flex items-baseline gap-2 mb-3.5">
            <span className="text-5xl font-display font-bold tabular-nums leading-none">{graceDays}</span>
            <span className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">{t("createVault.wizard.days")}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {GRACE_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setGraceSeconds(p * SECONDS_PER_DAY)}
                className={`border-4 border-foreground rounded-lg px-3.5 py-1.5 text-sm font-bold transition-all duration-150 ${
                  graceDays === p
                    ? "bg-[hsl(var(--step-accent))] shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                    : "bg-secondary hover:bg-[hsl(var(--step-accent)/0.4)]"
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Deadline box */}
      <div className="border-4 border-foreground rounded-[14px] bg-[#F7FEE7] p-5 mb-5 text-sm leading-relaxed">
        <span className="font-bold">{t("createVault.wizard.totalDeadline", { days: totalDays })}</span>{" "}
        {t("createVault.wizard.ifNoCheckin")}
        <span className="block mt-1.5 text-xs text-muted-foreground">
          {t("createVault.wizard.neverCheckin")} <strong>{futureDate(totalDays)}</strong>
        </span>
      </div>

      {/* Info box */}
      <div className="border-4 border-foreground rounded-xl bg-secondary p-4 text-sm leading-relaxed">
        <strong>{t("createVault.wizard.graceUndo")}</strong>{" "}
        {t("createVault.wizard.graceUndoDesc", { days: totalDays })}
      </div>
    </div>
  );
};

export default HeartbeatStep;