import { useState } from "react";
import { Button } from "@/components/ui/button";
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
      toast({ title: t("dashboard.manage.vaultClosedTitle"), description: t("dashboard.manage.vaultClosedDesc") });
    } catch (err: unknown) {
      track("emergency_withdraw_failed", { stage: "transaction" });
      toast({
        title: t("dashboard.manage.withdrawFailedTitle"),
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <>
      {/* The one irreversible action on the page. It stays an outline until
          hovered — red type on paper, not a red button waiting to be hit. */}
      <Button
        variant="destructive-outline"
        size="sm"
        className="w-full"
        onClick={() => setWithdrawConfirmOpen(true)}
        disabled={withdrawing}
      >
        {withdrawing ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> {t("dashboard.manage.withdrawing")}</>
        ) : (
          <><AlertTriangle className="h-4 w-4" /> {t("dashboard.manage.closeEstate")}</>
        )}
      </Button>

      <ConfirmDialog
        open={withdrawConfirmOpen}
        title={t("dashboard.manage.closeEstateConfirmTitle")}
        description={t("dashboard.manage.closeEstateConfirmDesc")}
        confirmLabel={t("dashboard.manage.withdrawCancelLabel")}
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
