import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useToast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const EmergencyWithdrawSection: React.FC<Props> = ({ estate, onTx }) => {
  const { revokeEstateOnChain } = useVault();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { t } = useTranslation("app");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);

  const performEmergencyWithdraw = async () => {
    setWithdrawing(true);
    try {
      const tx = await revokeEstateOnChain(estate.heir);
      onTx(tx);
      setWithdrawConfirmOpen(false);
      track("emergency_withdraw_succeeded");
      toast({ title: t("dashboard.manage.estateClosedTitle"), description: t("dashboard.manage.vaultClosedDesc") });
    } catch (err: unknown) {
      track("emergency_withdraw_failed", { stage: "transaction" });
      toast({ title: t("dashboard.manage.withdrawFailedTitle"), description: errMsg(err), variant: "destructive" });
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setWithdrawConfirmOpen(true)}
        disabled={withdrawing}
        className="flex w-full items-center gap-2.5 rounded-lg border border-accent-red/50 px-4 py-3 text-left text-sm font-semibold text-accent-red transition-colors hover:bg-accent-red/10 disabled:opacity-50"
      >
        {withdrawing ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> {t("dashboard.manage.withdrawing")}</>
        ) : (
          <><AlertTriangle className="h-4 w-4" /> {t("dashboard.manage.closeEstateShort")}</>
        )}
      </button>

      <ConfirmDialog
        open={withdrawConfirmOpen}
        cap={t("dashboard.manage.dangerZoneCap")}
        title={t("dashboard.manage.closeEstateQuestion")}
        description={t("dashboard.manage.closeEstateDescEditorial")}
        confirmLabel={t("dashboard.manage.closeEstateShort")}
        cancelLabel={t("dashboard.manage.keepEstate")}
        variant="destructive"
        loading={withdrawing}
        onConfirm={performEmergencyWithdraw}
        onCancel={() => {
          if (!withdrawing) setWithdrawConfirmOpen(false);
        }}
      />
    </>
  );
};

export default EmergencyWithdrawSection;