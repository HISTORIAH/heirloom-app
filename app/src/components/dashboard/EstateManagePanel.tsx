import type { UiWalletAccount } from "@wallet-standard/ui";
import { Panel, PanelCap } from "@/components/surface/Panel";
import { DASHBOARD_CARD } from "@/components/dashboard/estateState";
import ReassignHeirSection from "@/components/dashboard/ReassignHeirSection";
import EditSettingsSection from "@/components/dashboard/EditSettingsSection";
import AddAssetSection from "@/components/dashboard/AddAssetSection";
import EmergencyWithdrawSection from "@/components/dashboard/EmergencyWithdrawSection";
import { cn } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";
import type { EstateData } from "@/contexts/VaultContext";

interface EstateManagePanelProps {
  estate: EstateData;
  /** Signs in to the backend when closing the estate deletes its data. */
  account: UiWalletAccount;
  /** Shown as the current heir in the Change heir modal. */
  heirName: string | null;
  onTx: (id: string) => void;
  className?: string;
}

const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-sm text-muted-foreground">{children}</span>
);

export const EstateManagePanel: React.FC<EstateManagePanelProps> = ({
  estate,
  account,
  heirName,
  onTx,
  className,
}) => {
  const { t } = useTranslation("app");

  return (
    <Panel bare className={cn("h-full gap-[22px]", DASHBOARD_CARD, className)}>
      <PanelCap className="text-muted-foreground">{t("dashboard.manageEstate")}</PanelCap>

      <div className="flex flex-1 flex-col gap-[22px]">
        <section>
          <GroupLabel>{t("dashboard.heirTiming")}</GroupLabel>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <ReassignHeirSection estate={estate} heirName={heirName} onTx={onTx} />
            <EditSettingsSection estate={estate} onTx={onTx} />
          </div>
        </section>

        <section>
          <GroupLabel>{t("dashboard.assets")}</GroupLabel>
          <div className="mt-2.5">
            <AddAssetSection estate={estate} onTx={onTx} />
          </div>
        </section>

        <section>
          <GroupLabel>{t("dashboard.dangerZone")}</GroupLabel>
          <div className="mt-2.5">
            <EmergencyWithdrawSection estate={estate} account={account} onTx={onTx} />
          </div>
        </section>
      </div>
    </Panel>
  );
};
