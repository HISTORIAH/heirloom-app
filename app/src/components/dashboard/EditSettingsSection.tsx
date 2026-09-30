import { useEffect, useState } from "react";
import { useSignMessage } from "@solana/react";
import type { UiWalletAccount } from "@wallet-standard/ui";
import bs58 from "bs58";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Modal } from "@/components/surface/Modal";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticate } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { updateEstate } from "@/services/api/estateMetadata";
import { LABEL_MAX_LEN } from "@/lib/constants";
import { errMsg, formatDuration } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  estate: EstateData;
  /** Needed to sign in (SIWS) — renaming goes through the backend, not the chain. */
  account: UiWalletAccount;
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

const EditSettingsSection: React.FC<Props> = ({ estate, account, onTx }) => {
  const { t } = useTranslation("app");
  const { updateEstateFieldsOnChain, fetchEstates } = useVault();
  const { toast } = useToast();
  const authMutation = useAuthenticate(useSignMessage(account));

  const [open, setOpen] = useState(false);
  const [editIntervalSec, setEditIntervalSec] = useState(estate.checkInIntervalSecs);
  const [editGraceSec, setEditGraceSec] = useState(estate.gracePeriodSecs);
  const [editPauseSec, setEditPauseSec] = useState(estate.delegatePauseDurationSecs);
  const [editLabel, setEditLabel] = useState(estate.label ?? "");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsConfirmOpen, setSettingsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setEditIntervalSec(estate.checkInIntervalSecs);
      setEditGraceSec(estate.gracePeriodSecs);
      setEditPauseSec(estate.delegatePauseDurationSecs);
      setEditLabel(estate.label ?? "");
    }
  }, [
    open,
    estate.checkInIntervalSecs,
    estate.gracePeriodSecs,
    estate.delegatePauseDurationSecs,
    estate.label,
  ]);

  const timingDirty =
    editIntervalSec !== estate.checkInIntervalSecs ||
    editGraceSec !== estate.gracePeriodSecs ||
    editPauseSec !== estate.delegatePauseDurationSecs;
  const labelDirty = editLabel.trim() !== (estate.label ?? "");
  const settingsDirty = timingDirty || labelDirty;

  const labelValid = editLabel.trim().length > 0 && editLabel.length <= LABEL_MAX_LEN;
  const settingsValid = editIntervalSec > 0 && editGraceSec > 0 && editPauseSec >= 0 && labelValid;

  const requestSaveSettings = () => {
    if (!settingsDirty || !settingsValid) return;
    setSettingsConfirmOpen(true);
  };

  // PATCH needs the session cookie; on 401 sign in once and retry.
  const saveName = async (name: string) => {
    try {
      await updateEstate(estate.estatePda, { name });
    } catch (err) {
      const unauthorized =
        err instanceof ApiError && (err.code === "UNAUTHORIZED" || err.code === "unauthorized");
      if (!unauthorized) throw err;
      await authMutation.mutateAsync({ address: account.address, encode: bs58.encode });
      await updateEstate(estate.estatePda, { name });
    }
  };

  const performSaveSettings = async () => {
    setSavingSettings(true);
    try {
      // Name first: it may prompt a sign-in, and shouldn't be lost if the tx is rejected.
      if (labelDirty) await saveName(editLabel.trim());
      if (timingDirty) {
        const tx = await updateEstateFieldsOnChain(estate.heir, {
          checkInIntervalSecs:
            editIntervalSec !== estate.checkInIntervalSecs ? BigInt(editIntervalSec) : undefined,
          gracePeriodSecs:
            editGraceSec !== estate.gracePeriodSecs ? BigInt(editGraceSec) : undefined,
          delegatePauseDurationSecs:
            editPauseSec !== estate.delegatePauseDurationSecs ? BigInt(editPauseSec) : undefined,
        });
        onTx(tx);
      }
      setSettingsConfirmOpen(false);
      setOpen(false);
      toast({
        title: t("dashboard.manage.settingsUpdatedTitle"),
        description: t("dashboard.manage.nowUsesTimings"),
      });
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
        className="w-full rounded-lg border border-tile-line px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-tile-soft"
      >
        {t("dashboard.manage.updateEstateShort")}
      </button>

      <Modal
        open={open}
        cap={t("dashboard.manage.timingCap")}
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
            <label className="ed-field-label" htmlFor="estate-label">
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
                <label className="ed-field-label" htmlFor={`estate-${d.key}`}>
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
          {labelDirty && (
            <Delta
              label={t("dashboard.manage.label")}
              from={estate.label ?? ""}
              to={editLabel.trim()}
            />
          )}
          {editIntervalSec !== estate.checkInIntervalSecs && (
            <Delta
              label={t("dashboard.manage.interval")}
              from={formatDuration(estate.checkInIntervalSecs)}
              to={formatDuration(editIntervalSec)}
            />
          )}
          {editGraceSec !== estate.gracePeriodSecs && (
            <Delta
              label={t("dashboard.manage.grace")}
              from={formatDuration(estate.gracePeriodSecs)}
              to={formatDuration(editGraceSec)}
            />
          )}
          {editPauseSec !== estate.delegatePauseDurationSecs && (
            <Delta
              label={t("dashboard.manage.pause")}
              from={formatDuration(estate.delegatePauseDurationSecs)}
              to={formatDuration(editPauseSec)}
            />
          )}
        </div>
      </ConfirmDialog>
    </>
  );
};

export default EditSettingsSection;
