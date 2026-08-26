import { ExternalLink } from "lucide-react";
import { Panel, PanelCap } from "@/components/surface/Panel";
import { cn, formatDuration, getSolanaExplorerTxUrl } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";
import type { EstateData } from "@/contexts/VaultContext";

interface EstateFactsBandProps {
  estate: EstateData;
  lastTxId: string | null;
  className?: string;
}

export const EstateFactsBand: React.FC<EstateFactsBandProps> = ({
  estate,
  lastTxId,
  className,
}) => {
  const { t, i18n } = useTranslation("app");
  const stamp = estate.lastHeartbeat > 0 ? estate.lastHeartbeat : estate.createdAt;
  const lastCheckIn = new Date(stamp * 1000).toLocaleString(i18n.language, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const cells = [
    { cap: t("dashboard.lastCheckIn"), value: lastCheckIn },
    { cap: t("dashboard.checkInInterval"), value: formatDuration(estate.heartbeatInterval) },
    { cap: t("dashboard.gracePeriod"), value: formatDuration(estate.gracePeriod) },
  ];

  return (
    <Panel className={className}>
      <div
        className={cn(
          "grid gap-5",
          lastTxId ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3",
        )}
      >
        {cells.map((cell) => (
          <div key={cell.cap} className="min-w-0">
            <PanelCap className="text-muted-foreground">{cell.cap}</PanelCap>
            <p className="mt-1.5 text-sm font-semibold tabular-nums">{cell.value}</p>
          </div>
        ))}
        {lastTxId && (
          <div className="min-w-0">
            <PanelCap className="text-muted-foreground">{t("dashboard.lastTx")}</PanelCap>
            <a
              href={getSolanaExplorerTxUrl(lastTxId)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4 transition-colors hover:text-muted-foreground"
            >
              {t("common.viewOnExplorer")} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </Panel>
  );
};
