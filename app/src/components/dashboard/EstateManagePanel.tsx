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
    <Panel className={cn("h-full gap-6", className)}>
      <PanelCap className="text-muted-foreground">{t("dashboard.manageEstate")}</PanelCap>

      <div className="flex flex-1 flex-col gap-5">
        <section>
          <PanelCap className="text-muted-foreground">{t("dashboard.heirTiming")}</PanelCap>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <ReassignHeirSection estate={estate} onTx={onTx} />
            <EditSettingsSection estate={estate} onTx={onTx} />
          </div>
        </section>

        <section>
          <PanelCap className="text-muted-foreground">{t("dashboard.assets")}</PanelCap>
          <div className="mt-2.5">
            <AddAssetSection estate={estate} onTx={onTx} />
          </div>
        </section>

        <section>
          <PanelCap className="text-muted-foreground">{t("dashboard.dangerZone")}</PanelCap>
          <div className="mt-2.5">
            <EmergencyWithdrawSection estate={estate} onTx={onTx} />
          </div>
        </section>
      </div>
    </Panel>
  );
};
