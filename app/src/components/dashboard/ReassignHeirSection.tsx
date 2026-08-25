import { useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import Sheet from "@/components/app/Sheet";
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
        description: t("dashboard.manage.sameHeirDesc"),
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
      toast({ title: t("dashboard.manage.heirUpdatedTitle"), description: t("dashboard.manage.heirUpdatedDesc") });
      await fetchEstates();
    } catch (err: unknown) {
      track("heir_reassign_failed", { stage: "transaction" });
      toast({
        title: t("dashboard.manage.updateFailedTitle"),
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setUpdatingHeir(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        {t("dashboard.manage.changeHeir")}
      </Button>

      <Sheet
        open={open}
        title={t("dashboard.manage.changeHeir")}
        caption={t("dashboard.heir")}
        icon={<UserPlus strokeWidth={2} />}
        busy={updatingHeir}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              {t("dashboard.manage.cancel")}
            </Button>
            <Button
              onClick={handleUpdateHeir}
              disabled={!newHeirAddress.trim()}
              className="w-full sm:w-auto"
            >
              <UserPlus className="h-4 w-4" /> {t("dashboard.manage.changeHeir")}
            </Button>
          </>
        }
      >
        <p className="text-sm font-medium text-muted-foreground">
          {t("dashboard.manage.changeHeirDesc")}
        </p>
        <input
          type="text"
          value={newHeirAddress}
          onChange={(e) => setNewHeirAddress(e.target.value)}
          maxLength={128}
          className="field field-mono mt-4"
          placeholder={t("dashboard.manage.newHeirPlaceholder")}
        />
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          {t("dashboard.manage.changeHeirWarning")}
        </p>
      </Sheet>

      <ConfirmDialog
        open={reassignConfirm.open}
        title={t("dashboard.manage.changeHeirConfirmTitle")}
        description={t("dashboard.manage.changeHeirConfirmDesc")}
        confirmLabel={t("dashboard.manage.changeHeir")}
        cancelLabel={t("dashboard.manage.cancel")}
        variant="default"
        loading={updatingHeir}
        icon={<UserPlus strokeWidth={2} />}
        onConfirm={performUpdateHeir}
        onCancel={() => {
          if (!updatingHeir) setReassignConfirm({ open: false, next: "" });
        }}
      >
        {/* The whole point of the confirmation is the pair of addresses, so
            they are set as the only two rows in it. */}
        <div className="mt-1">
          <div className="data-row flex-col items-start gap-1">
            <span className="cap">{t("dashboard.manage.from")}</span>
            <span className="break-all font-mono text-xs">{estate.heir}</span>
          </div>
          <div className="data-row flex-col items-start gap-1">
            <span className="cap">{t("dashboard.manage.to")}</span>
            <span className="break-all font-mono text-xs font-semibold">{reassignConfirm.next}</span>
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
};

export default ReassignHeirSection;
