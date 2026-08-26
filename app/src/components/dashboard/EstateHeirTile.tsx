import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Panel, PanelCap } from "@/components/surface/Panel";
import { cn, truncateAddress } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";
import type { EstateData } from "@/contexts/VaultContext";

const Addr: React.FC<{ value: string | null; empty: string }> = ({ value, empty }) => {
  if (!value) return <span>{empty}</span>;
  return (
    <span className="font-mono tabular-nums" title={value}>
      {truncateAddress(value, 4)}
    </span>
  );
};

export const EstateHeirTile: React.FC<{ estate: EstateData; className?: string }> = ({
  estate,
  className,
}) => {
  const { t } = useTranslation("app");
  const [copied, setCopied] = useState(false);

  const handleCopyHeir = () => {
    navigator.clipboard.writeText(estate.heir);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Panel className={cn("h-full", className)}>
      <PanelCap className="text-muted-foreground">{t("dashboard.heirDetails")}</PanelCap>

      <button
        onClick={handleCopyHeir}
        title={t("dashboard.copyHeirAddress")}
        className="mt-5 flex w-full items-start justify-between gap-3 rounded-lg border border-tile-line bg-background px-4 py-3.5 text-left transition-colors hover:bg-tile-soft"
      >
        <div className="min-w-0">
          <PanelCap className="text-muted-foreground">{t("dashboard.heir")}</PanelCap>
          <p className="mt-1.5 font-semibold">{estate.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Addr value={estate.heir} empty={t("common.notSet")} />
          </p>
        </div>
        {copied ? (
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <Copy className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      <div className="mt-1 divide-y divide-tile-line">
        <div className="py-4">
          <PanelCap className="text-muted-foreground">
            {t("dashboard.guardian")}
            {estate.delegate && estate.isDeferred ? ` (${t("dashboard.pauseUsed")})` : ""}
          </PanelCap>
          <p className="mt-1.5 text-sm">
            <Addr value={estate.delegate} empty={t("common.notSet")} />
          </p>
        </div>

        <div className="py-4">
          <PanelCap className="text-muted-foreground">{t("dashboard.heartbeatSigner")}</PanelCap>
          <p className="mt-1.5 text-sm">
            <Addr value={estate.hbSigner} empty={t("common.notSet")} />
          </p>
        </div>
      </div>
    </Panel>
  );
};
