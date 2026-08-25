import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useToast } from "@/hooks/use-toast";
import { LABEL_MAX_LEN } from "@/lib/constants";
import { errMsg, formatDuration } from "@/lib/utils";
import { Pencil } from "lucide-react";
import Sheet from "@/components/app/Sheet";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const EditSettingsSection: React.FC<Props> = ({ estate, onTx }) => {
  const { updateEstateFieldsOnChain, fetchEstates } = useVault();
  const { toast } = useToast();
  const { t } = useTranslation("app");

  const [open, setOpen] = useState(false);
  const [editIntervalSec, setEditIntervalSec] = useState(estate.heartbeatInterval);
  const [editGraceSec, setEditGraceSec] = useState(estate.gracePeriod);
  const [editPauseSec, setEditPauseSec] = useState(estate.pauseDuration);
  const [editLabel, setEditLabel] = useState(estate.label);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsConfirmOpen, setSettingsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setEditIntervalSec(estate.heartbeatInterval);
      setEditGraceSec(estate.gracePeriod);
      setEditPauseSec(estate.pauseDuration);
      setEditLabel(estate.label);
    }
  }, [
    open,
    estate.heartbeatInterval,
    estate.gracePeriod,
    estate.pauseDuration,
    estate.label,
  ]);

  const settingsDirty =
    editIntervalSec !== estate.heartbeatInterval ||
    editGraceSec !== estate.gracePeriod ||
    editPauseSec !== estate.pauseDuration ||
    editLabel.trim() !== estate.label;

  const labelValid = editLabel.trim().length > 0 && editLabel.length <= LABEL_MAX_LEN;
  const settingsValid =
    editIntervalSec > 0 && editGraceSec > 0 && editPauseSec >= 0 && labelValid;

  const requestSaveSettings = () => {
    if (!settingsDirty || !settingsValid) return;
    setSettingsConfirmOpen(true);
  };

  const performSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const tx = await updateEstateFieldsOnChain(estate.heir, {
        heartbeatInterval:
          editIntervalSec !== estate.heartbeatInterval
            ? BigInt(editIntervalSec)
            : undefined,
        gracePeriod:
          editGraceSec !== estate.gracePeriod ? BigInt(editGraceSec) : undefined,
        pauseDuration:
          editPauseSec !== estate.pauseDuration ? BigInt(editPauseSec) : undefined,
        label: editLabel.trim() !== estate.label ? editLabel.trim() : undefined,
      });
      onTx(tx);
      setSettingsConfirmOpen(false);
      setOpen(false);
      toast({ title: t("dashboard.manage.settingsUpdatedTitle"), description: t("dashboard.manage.settingsUpdatedDesc") });
      await fetchEstates();
    } catch (err: unknown) {
      toast({
        title: t("dashboard.manage.updateFailedTitle"),
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        {t("dashboard.manage.updateEstate")}
      </Button>

      <Sheet
        open={open}
        title={t("dashboard.manage.updateEstate")}
        caption={t("createVault.wizard.timing")}
        description={t("dashboard.manage.updateEstateDesc")}
        busy={savingSettings}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              {t("dashboard.manage.cancel")}
            </Button>
            <Button
              onClick={requestSaveSettings}
              disabled={!settingsDirty || !settingsValid}
              className="w-full sm:w-auto"
            >
              <Pencil className="h-4 w-4" /> {t("dashboard.manage.saveChanges")}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="cap mb-2 block">
              {t("dashboard.manage.labelMax", { max: LABEL_MAX_LEN })}
            </label>
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value.slice(0, LABEL_MAX_LEN))}
              maxLength={LABEL_MAX_LEN}
              className="field"
              placeholder={t("dashboard.manage.estateLabelPlaceholder")}
            />
          </div>

          {/* Three durations, set as one ruled row of fields — each with the
              same number said in words underneath, because seconds are not a
              unit anybody thinks in. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                key: "interval",
                label: t("dashboard.manage.intervalSec"),
                value: editIntervalSec,
                min: 1,
                set: (n: number) => setEditIntervalSec(Math.max(1, n)),
              },
              {
                key: "grace",
                label: t("dashboard.manage.graceSec"),
                value: editGraceSec,
                min: 1,
                set: (n: number) => setEditGraceSec(Math.max(1, n)),
              },
              {
                key: "pause",
                label: t("dashboard.manage.pauseSec"),
                value: editPauseSec,
                min: 0,
                set: (n: number) => setEditPauseSec(Math.max(0, n)),
              },
            ].map((f) => (
              <div key={f.key}>
                <label className="cap mb-2 block">{f.label}</label>
                <input
                  type="number"
                  min={f.min}
                  value={f.value}
                  onChange={(e) => f.set(Number(e.target.value))}
                  className="field tabular-nums"
                />
                <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                  {formatDuration(f.value)}
                </p>
              </div>
            ))}
          </div>

          {!labelValid && (
            <p className="text-xs font-bold text-accent-red">
              {t("dashboard.manage.labelInvalid", { max: LABEL_MAX_LEN })}
            </p>
          )}
        </div>
      </Sheet>

      <ConfirmDialog
        open={settingsConfirmOpen}
        title={t("dashboard.manage.updateEstateConfirmTitle")}
        caption={t("createVault.wizard.timing")}
        description={t("dashboard.manage.updateEstateConfirmDesc")}
        confirmLabel={t("dashboard.manage.save")}
        cancelLabel={t("dashboard.manage.cancel")}
        variant="default"
        loading={savingSettings}
        onConfirm={performSaveSettings}
        onCancel={() => {
          if (!savingSettings) setSettingsConfirmOpen(false);
        }}
      >
        <div className="mt-1 text-sm">
          {editLabel.trim() !== estate.label && (
            <div className="data-row">
              <span className="data-k">{t("dashboard.manage.label")}</span>
              <span className="text-right">
                <span className="text-muted-foreground">{estate.label}</span> →{" "}
                <span className="font-semibold">{editLabel.trim()}</span>
              </span>
            </div>
          )}
          {editIntervalSec !== estate.heartbeatInterval && (
            <div className="data-row">
              <span className="data-k">{t("dashboard.manage.interval")}</span>
              <span className="text-right">
                <span className="text-muted-foreground">{formatDuration(estate.heartbeatInterval)}</span> →{" "}
                <span className="font-semibold">{formatDuration(editIntervalSec)}</span>
              </span>
            </div>
          )}
          {editGraceSec !== estate.gracePeriod && (
            <div className="data-row">
              <span className="data-k">{t("dashboard.manage.grace")}</span>
              <span className="text-right">
                <span className="text-muted-foreground">{formatDuration(estate.gracePeriod)}</span> →{" "}
                <span className="font-semibold">{formatDuration(editGraceSec)}</span>
              </span>
            </div>
          )}
          {editPauseSec !== estate.pauseDuration && (
            <div className="data-row">
              <span className="data-k">{t("dashboard.manage.pause")}</span>
              <span className="text-right">
                <span className="text-muted-foreground">{formatDuration(estate.pauseDuration)}</span> →{" "}
                <span className="font-semibold">{formatDuration(editPauseSec)}</span>
              </span>
            </div>
          )}
        </div>
      </ConfirmDialog>
    </>
  );
};

export default EditSettingsSection;