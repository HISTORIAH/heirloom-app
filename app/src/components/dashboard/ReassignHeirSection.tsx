import { useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Modal } from "@/components/surface/Modal";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useToast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/utils";
import { UserPlus } from "lucide-react";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const ReassignHeirSection: React.FC<Props> = ({ estate, onTx }) => {
  const { updateHeirOnChain, fetchEstates } = useVault();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { t } = useTranslation("app");
  const [open, setOpen] = useState(false);
  const [newHeirAddress, setNewHeirAddress] = useState("");
  const [updatingHeir, setUpdatingHeir] = useState(false);
  const [reassignConfirm, setReassignConfirm] = useState<{ open: boolean; next: string }>({
    open: false,
    next: "",
  });

  const handleUpdateHeir = () => {
    const trimmed = newHeirAddress.trim();
    if (!trimmed) return;
    if (trimmed === estate.heir) {
      toast({
        title: t("dashboard.manage.sameHeirTitle"),
        description: t("dashboard.manage.alreadyHeirDesc"),
        variant: "destructive",
      });
      return;
    }
    setReassignConfirm({ open: true, next: trimmed });
  };

  const performUpdateHeir = async () => {
    const trimmed = reassignConfirm.next;
    if (!trimmed) return;
    setUpdatingHeir(true);
    try {
      const tx = await updateHeirOnChain(estate.heir, trimmed);
      onTx(tx);
      setNewHeirAddress("");
      setOpen(false);
      setReassignConfirm({ open: false, next: "" });
      track("heir_reassigned");
      toast({ title: t("dashboard.manage.heirUpdatedTitle"), description: t("dashboard.manage.migratedDesc") });
      await fetchEstates();
    } catch (err: unknown) {
      track("heir_reassign_failed", { stage: "transaction" });
      toast({ title: t("dashboard.manage.updateFailedTitle"), description: errMsg(err), variant: "destructive" });
    } finally {
      setUpdatingHeir(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-tile-line px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-tile-soft"
      >
        {t("dashboard.manage.changeHeirShort")}
      </button>

      <Modal
        open={open}
        cap={t("dashboard.manage.heirCap")}
        title={t("dashboard.manage.changeHeirShort")}
        description={t("dashboard.manage.changeHeirMigrateDesc")}
        busy={updatingHeir}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button
              variant="flat-outline"
              size="default"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="flat"
              size="default"
              onClick={handleUpdateHeir}
              disabled={!newHeirAddress.trim()}
              className="w-full sm:w-auto"
            >
              <UserPlus className="h-4 w-4" /> {t("dashboard.manage.changeHeirShort")}
            </Button>
          </>
        }
      >
        <label className="ed-field-label" htmlFor="new-heir-address">
          {t("dashboard.manage.newHeirAddress")}
        </label>
        <input
          id="new-heir-address"
          type="text"
          value={newHeirAddress}
          onChange={(e) => setNewHeirAddress(e.target.value)}
          maxLength={128}
          className="ed-input mt-2 font-mono"
          placeholder={t("dashboard.manage.addressPlaceholder")}
        />
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          {t("dashboard.manage.reassignPauseNote")}
        </p>
      </Modal>

      <ConfirmDialog
        open={reassignConfirm.open}
        cap={t("dashboard.manage.heirCap")}
        title={t("dashboard.manage.changeHeirQuestion")}
        description={t("dashboard.manage.changeHeirMovesDesc")}
        confirmLabel={t("dashboard.manage.changeHeirShort")}
        cancelLabel={t("common.cancel")}
        variant="default"
        loading={updatingHeir}
        onConfirm={performUpdateHeir}
        onCancel={() => {
          if (!updatingHeir) setReassignConfirm({ open: false, next: "" });
        }}
      >
        <div className="space-y-2">
          <div className="rounded-lg border border-tile-line bg-tile-soft px-4 py-3">
            <p className="ed-label">{t("dashboard.manage.from")}</p>
            <p className="mt-1 break-all font-mono text-xs">{estate.heir}</p>
          </div>
          <div className="rounded-lg border border-accent-pink/60 bg-accent-pink/10 px-4 py-3">
            <p className="ed-label">{t("dashboard.manage.to")}</p>
            <p className="mt-1 break-all font-mono text-xs">{reassignConfirm.next}</p>
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
};

export default ReassignHeirSection;
