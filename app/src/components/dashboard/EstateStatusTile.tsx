import { ExternalLink, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PanelCap } from "@/components/surface/Panel";
import { toneMuted } from "@/components/surface/tones";
import { cn, formatDuration, getSolanaExplorerTxUrl } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";
import type { EstateData } from "@/contexts/VaultContext";
import {
  STATE_LINE,
  STATE_TONE,
  DASHBOARD_CARD,
  countdownDeadline,
  statusMeta,
  type CountdownParts,
  type UiState,
} from "@/components/dashboard/estateState";

interface EstateStatusTileProps {
  estate: EstateData;
  state: UiState;
  countdown: CountdownParts;
  lastTxId: string | null;
  sending: boolean;
  onCheckIn: () => void;
  className?: string;
}

export const EstateStatusTile: React.FC<EstateStatusTileProps> = ({
  estate,
  state,
  countdown,
  lastTxId,
  sending,
  onCheckIn,
  className,
}) => {
  const { t, i18n } = useTranslation("app");
  const tone = STATE_TONE[state];
  const meta = statusMeta(t)[state];
  const line = STATE_LINE[state];
  const muted = toneMuted[tone];

  const formatStamp = (secs: number) =>
    new Date(secs * 1000).toLocaleString(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const checkInVariant =
    state === "grace" ? "flat-sage" : state === "claimable" ? "flat" : "flat-yellow";

  const deadline = countdownDeadline(estate, state);
  const units = [
    { label: t("dashboard.days"), value: countdown.days },
    { label: t("dashboard.hours"), value: countdown.hours },
  ];

  const facts = [
    {
      cap: t("dashboard.lastCheckIn"),
      value: formatStamp(estate.lastCheckInTs > 0 ? estate.lastCheckInTs : estate.createdAt),
    },
    {
      cap: t("dashboard.checkInInterval"),
      value: formatDuration(estate.checkInIntervalSecs, { long: true }),
    },
    {
      cap: t("dashboard.gracePeriod"),
      value: formatDuration(estate.gracePeriodSecs, { long: true }),
    },
  ];

  return (
    <Panel tone={tone} bare className={cn("h-full", DASHBOARD_CARD, className)}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex rounded-full border border-tile-line px-2.5 py-1">
            <PanelCap className={muted}>{t("dashboard.vaultStatus")}</PanelCap>
          </span>
          <h2 className="ed-h2 mt-[18px] font-bold tracking-[-0.03em]">{meta.label}</h2>
          <p className={cn("mt-3.5 max-w-[46ch] text-lg font-medium", muted)}>
            {meta.description}
          </p>
        </div>
        {state !== "distributed" && (
          <div className="shrink-0 sm:max-w-[16rem] sm:text-right">
            <Button
              variant={checkInVariant}
              size="lg"
              onClick={onCheckIn}
              disabled={sending}
              className="h-auto w-full px-9 py-4 text-sm sm:w-auto"
            >
              {sending ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> {t("dashboard.signing")}</>
              ) : state === "claimable" ? (
                <><Heart className="h-5 w-5" fill="currentColor" /> {t("dashboard.imAlive")}</>
              ) : (
                <><Heart className="h-5 w-5" fill="currentColor" /> {t("dashboard.checkIn")}</>
              )}
            </Button>
            {!sending && (
              <p className={cn("mt-2 text-xs font-medium sm:text-right", muted)}>
                {t("dashboard.restartsTimer")}
              </p>
            )}
          </div>
        )}
      </div>

      {deadline !== null && (
        <div
          className={cn(
            "mt-7 flex flex-wrap items-end gap-x-9 gap-y-5 border-t pt-6",
            line,
          )}
        >
          {units.map((unit) => (
            <div key={unit.label}>
              <span className="font-display text-[clamp(2.75rem,5vw,4.5rem)] font-bold leading-none tracking-[-0.03em] tabular-nums">
                {unit.value}
              </span>
              <p className={cn("mt-1.5 text-sm", muted)}>{unit.label}</p>
            </div>
          ))}
          <div className="w-full sm:ml-auto sm:w-auto sm:text-right">
            <span className="flex items-center gap-2 sm:justify-end">
              {state === "grace" && (
                <span className="rounded-full bg-accent-yellow px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground">
                  {t("dashboard.urgent")}
                </span>
              )}
              <span className={cn("text-sm", muted)}>
                {state === "grace" ? t("dashboard.claimableFrom") : t("dashboard.nextCheckInDue")}
              </span>
            </span>
            <p className="mt-1 text-base font-semibold tabular-nums">{formatStamp(deadline)}</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 rounded-xl bg-tile-soft px-[18px] py-4 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.cap} className="min-w-0">
            <span className="text-sm text-muted-foreground">{fact.cap}</span>
            <p className="mt-1 text-base font-semibold tabular-nums">{fact.value}</p>
          </div>
        ))}
      </div>

      {lastTxId && (
        <a
          href={getSolanaExplorerTxUrl(lastTxId)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "mt-4 flex items-center gap-1.5 self-start text-xs font-semibold underline underline-offset-4 transition-colors hover:text-foreground",
            muted,
          )}
        >
          {t("dashboard.lastTx")} · {t("common.viewOnExplorer")} <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </Panel>
  );
};
