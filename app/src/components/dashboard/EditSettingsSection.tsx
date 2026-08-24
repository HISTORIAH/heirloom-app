import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Modal } from "@/components/surface/Modal";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useToast } from "@/hooks/use-toast";
import { LABEL_MAX_LEN } from "@/lib/constants";
import { errMsg, formatDuration } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const Delta: React.FC<{ label: string; from: string; to: string }> = ({ label, from, to }) => (
  <div className="flex items-baseline justify-between gap-3 rounded-lg border border-tile-line bg-tile-soft px-4 py-3">
    <span className="ed-label">{label}</span>
    <span className="text-right text-xs">
      <span className="text-muted-foreground line-through">{from}</span>{" "}
      <span className="font-semibold">{to}</span>
    </span>
  </div>
);

const EditSettingsSection: React.FC<Props> = ({ estate, onTx }) => {
  const { t } = useTranslation("app");
  const { updateEstateFieldsOnChain, fetchEstates } = useVault();
  const { toast } = useToast();

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
  }, [open, estate.heartbeatInterval, estate.gracePeriod, estate.pauseDuration, estate.label]);

  const settingsDirty =
    editIntervalSec !== estate.heartbeatInterval ||
    editGraceSec !== estate.gracePeriod ||
    editPauseSec !== estate.pauseDuration ||
    editLabel.trim() !== estate.label;

  const labelValid = editLabel.trim().length > 0 && editLabel.length <= LABEL_MAX_LEN;
  const settingsValid = editIntervalSec > 0 && editGraceSec > 0 && editPauseSec >= 0 && labelValid;

  const requestSaveSettings = () => {
    if (!settingsDirty || !settingsValid) return;
    setSettingsConfirmOpen(true);
  };

  const performSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const tx = await updateEstateFieldsOnChain(estate.heir, {
        heartbeatInterval:
          editIntervalSec !== estate.heartbeatInterval ? BigInt(editIntervalSec) : undefined,
        gracePeriod: editGraceSec !== estate.gracePeriod ? BigInt(editGraceSec) : undefined,
        pauseDuration: editPauseSec !== estate.pauseDuration ? BigInt(editPauseSec) : undefined,
        label: editLabel.trim() !== estate.label ? editLabel.trim() : undefined,
      });
      onTx(tx);
      setSettingsConfirmOpen(false);
      setOpen(false);
      toast({ title: t("dashboard.manage.settingsUpdatedTitle"), description: t("dashboard.manage.nowUsesTimings") });
      await fetchEstates();
    } catch (err: unknown) {
      toast({ title: t("dashboard.manage.updateFailedTitle"), description: errMsg(err), variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const durations = [
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
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 rounded-lg border border-tile-line px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-tile-soft"
      >
        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent-cyan" />
        {t("dashboard.manage.updateEstateShort")}
      </button>

      <Modal
        open={open}
        cap={t("dashboard.manage.timingCap")}
        accent="bg-accent-cyan"
        title={t("dashboard.manage.updateEstateShort")}
        description={t("dashboard.manage.updateEstateEditorialDesc")}
        size="lg"
        busy={savingSettings}
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
            <label className="ed-label" htmlFor="estate-label">
              {t("dashboard.manage.labelMaxN", { max: LABEL_MAX_LEN })}
            </label>
            <input
              id="estate-label"
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value.slice(0, LABEL_MAX_LEN))}
              maxLength={LABEL_MAX_LEN}
              className="ed-input mt-2"
              placeholder={t("dashboard.manage.spousePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {durations.map((d) => (
              <div key={d.key}>
                <label className="ed-label" htmlFor={`estate-${d.key}`}>
                  {d.label}
                </label>
                <input
                  id={`estate-${d.key}`}
                  type="number"
                  min={d.min}
                  value={d.value}
                  onChange={(e) => d.set(Number(e.target.value))}
                  className="ed-input mt-2 tabular-nums"
                />
                <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                  {formatDuration(d.value)}
                </p>
              </div>
            ))}
          </div>

          {!labelValid && (
            <p className="text-xs font-semibold text-accent-red">
              {t("dashboard.manage.labelRequiredMax", { max: LABEL_MAX_LEN })}
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={settingsConfirmOpen}
        cap={t("dashboard.manage.timingCap")}
        accent="bg-accent-cyan"
        title={t("dashboard.manage.saveChangesQuestion")}
        description={t("dashboard.manage.saveCountsCheckIn")}
        confirmLabel={t("dashboard.manage.save")}
        cancelLabel={t("common.cancel")}
        variant="default"
        loading={savingSettings}
        onConfirm={performSaveSettings}
        onCancel={() => {
          if (!savingSettings) setSettingsConfirmOpen(false);
        }}
      >
        <div className="space-y-2">
          {editLabel.trim() !== estate.label && (
            <Delta label={t("dashboard.manage.label")} from={estate.label} to={editLabel.trim()} />
          )}
          {editIntervalSec !== estate.heartbeatInterval && (
            <Delta
              label={t("dashboard.manage.interval")}
              from={formatDuration(estate.heartbeatInterval)}
              to={formatDuration(editIntervalSec)}
            />
          )}
          {editGraceSec !== estate.gracePeriod && (
            <Delta
              label={t("dashboard.manage.grace")}
              from={formatDuration(estate.gracePeriod)}
              to={formatDuration(editGraceSec)}
            />
          )}
          {editPauseSec !== estate.pauseDuration && (
            <Delta
              label={t("dashboard.manage.pause")}
              from={formatDuration(estate.pauseDuration)}
              to={formatDuration(editPauseSec)}
            />
          )}
        </div>
      </ConfirmDialog>
    </>
  );
};

export default EditSettingsSection;
