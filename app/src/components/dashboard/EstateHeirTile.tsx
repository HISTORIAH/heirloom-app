import { useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import { Panel, PanelCap } from "@/components/surface/Panel";
import { useTranslation } from "@heirloom/i18n";
import type { EstateData } from "@/contexts/VaultContext";

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
    <Panel className={className}>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <PanelCap className="text-muted-foreground">{t("dashboard.heirDetails")}</PanelCap>
          <ChevronDown
            className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
            strokeWidth={2}
          />
        </summary>

        <div className="mt-5 divide-y divide-tile-line border-t border-tile-line">
          <button
            onClick={handleCopyHeir}
            title={t("dashboard.copyHeirAddress")}
            className="flex w-full items-center justify-between gap-3 py-4 text-left transition-colors hover:bg-tile-soft"
          >
            <div className="min-w-0">
              <PanelCap className="text-muted-foreground">{t("dashboard.heir")}</PanelCap>
              <p className="mt-1.5 font-semibold">{estate.label}</p>
              <p className="break-all font-mono text-xs text-muted-foreground">{estate.heir}</p>
            </div>
            {copied ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>

          <div className="py-4">
            <PanelCap className="text-muted-foreground">
              {t("dashboard.guardian")}
              {estate.delegate && estate.isDeferred ? ` (${t("dashboard.pauseUsed")})` : ""}
            </PanelCap>
            <p className="mt-1.5 break-all font-mono text-xs">
              {estate.delegate || t("common.notSet")}
            </p>
          </div>

          <div className="py-4">
            <PanelCap className="text-muted-foreground">{t("dashboard.heartbeatSigner")}</PanelCap>
            <p className="mt-1.5 break-all font-mono text-xs">
              {estate.hbSigner || t("common.notSet")}
            </p>
          </div>
        </div>
      </details>
    </Panel>
  );
};
