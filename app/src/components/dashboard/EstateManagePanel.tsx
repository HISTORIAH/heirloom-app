import { Panel, PanelCap } from "@/components/surface/Panel";
import ReassignHeirSection from "@/components/dashboard/ReassignHeirSection";
import EditSettingsSection from "@/components/dashboard/EditSettingsSection";
import AddAssetSection from "@/components/dashboard/AddAssetSection";
import EmergencyWithdrawSection from "@/components/dashboard/EmergencyWithdrawSection";
import { cn } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";
import type { EstateData } from "@/contexts/VaultContext";

interface EstateManagePanelProps {
  estate: EstateData;
  onTx: (id: string) => void;
  className?: string;
}

export const EstateManagePanel: React.FC<EstateManagePanelProps> = ({
  estate,
  onTx,
  className,
}) => {
  const { t } = useTranslation("app");

  return (
    <Panel tone="soft" className={cn("gap-6", className)}>
      <PanelCap className="text-muted-foreground">{t("dashboard.manageEstate")}</PanelCap>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2.5">
          <PanelCap className="text-muted-foreground/70">{t("dashboard.heirTiming")}</PanelCap>
          <div className="grid gap-2">
            <ReassignHeirSection estate={estate} onTx={onTx} />
            <EditSettingsSection estate={estate} onTx={onTx} />
          </div>
        </div>

        <div className="space-y-2.5">
          <PanelCap className="text-muted-foreground/70">{t("dashboard.assets")}</PanelCap>
          <AddAssetSection estate={estate} onTx={onTx} />
        </div>

        <div className="space-y-2.5">
          <PanelCap className="text-muted-foreground/70">{t("dashboard.dangerZone")}</PanelCap>
          <EmergencyWithdrawSection estate={estate} onTx={onTx} />
        </div>
      </div>
    </Panel>
  );
};
