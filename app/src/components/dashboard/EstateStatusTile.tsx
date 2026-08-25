import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PanelCap } from "@/components/surface/Panel";
import { toneMuted } from "@/components/surface/tones";
import { cn } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";
import {
  STATE_LINE,
  STATE_TONE,
  statusMeta,
  type CountdownParts,
  type UiState,
} from "@/components/dashboard/estateState";

interface EstateStatusTileProps {
  state: UiState;
  countdown: CountdownParts;
  countdownLabel: string;
  sending: boolean;
  onCheckIn: () => void;
  className?: string;
}

export const EstateStatusTile: React.FC<EstateStatusTileProps> = ({
  state,
  countdown,
  countdownLabel,
  sending,
  onCheckIn,
  className,
}) => {
  const { t } = useTranslation("app");
  const tone = STATE_TONE[state];
  const meta = statusMeta(t)[state];
  const line = STATE_LINE[state];
  const muted = toneMuted[tone];

  const units = [
    { label: t("dashboard.days"), value: countdown.days },
    { label: t("dashboard.hours"), value: countdown.hours },
    { label: t("dashboard.min"), value: countdown.minutes },
    { label: t("dashboard.sec"), value: countdown.seconds },
  ];

  return (
    <Panel tone={tone} className={cn("justify-between gap-7", className)}>
      <div className="flex items-start justify-between gap-4">
        <PanelCap className={muted}>{t("dashboard.vaultStatus")}</PanelCap>
        {state === "grace" && (
          <span className="rounded-md border border-foreground/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]">
            {t("dashboard.urgent")}
          </span>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="ed-h2">{meta.label}</h2>
        </div>
        <p className={cn("ed-body mt-3 max-w-[46ch]", muted)}>{meta.description}</p>
      </div>

      <div className={cn("border-t pt-6", line)}>
        <PanelCap className={muted}>{countdownLabel}</PanelCap>
        <div className={cn("mt-4 grid grid-cols-4 divide-x", line)}>
          {units.map((unit, i) => (
            <div key={unit.label} className={cn("min-w-0", i === 0 ? "pr-4" : "px-4 last:pr-0")}>
              <span className="font-display text-[clamp(2rem,3.6vw,3.75rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums">
                {String(unit.value).padStart(2, "0")}
              </span>
              <p
                className={cn(
                  "mt-2 text-[10px] font-bold uppercase tracking-[0.16em] md:text-[11px]",
                  muted,
                )}
              >
                {unit.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {state !== "distributed" && (
        <div className={cn("border-t pt-6", line)}>
          <Button
            variant={state === "grace" ? "flat" : "flat-yellow"}
            size="lg"
            onClick={onCheckIn}
            disabled={sending}
            className="w-full"
          >
            {sending ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> {t("dashboard.signing")}</>
            ) : state === "claimable" ? (
              <><Heart className="h-5 w-5" fill="currentColor" /> {t("dashboard.imAlive")}</>
            ) : (
              <><Heart className="h-5 w-5" fill="currentColor" /> {t("dashboard.checkIn")}</>
            )}
          </Button>
          {state === "claimable" && !sending && (
            <p className={cn("mt-3 text-center text-xs font-medium", muted)}>
              {t("dashboard.restartsTimer")}
            </p>
          )}
        </div>
      )}
    </Panel>
  );
};
