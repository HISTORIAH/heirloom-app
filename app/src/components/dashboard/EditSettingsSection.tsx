import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useToast } from "@/hooks/use-toast";
import { LABEL_MAX_LEN } from "@/config/constants";
import { errMsg, formatDuration } from "@/lib/utils";
import { Loader2, Pencil, Settings } from "lucide-react";

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const EditSettingsSection: React.FC<Props> = ({ estate, onTx }) => {
  const { updateEstateFieldsOnChain, fetchEstates } = useVault();
  const { toast } = useToast();

  const [showEditSettings, setShowEditSettings] = useState(false);
  const [editIntervalSec, setEditIntervalSec] = useState(estate.heartbeatInterval);
  const [editGraceSec, setEditGraceSec] = useState(estate.gracePeriod);
  const [editPauseSec, setEditPauseSec] = useState(estate.pauseDuration);
  const [editLabel, setEditLabel] = useState(estate.label);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsConfirmOpen, setSettingsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!showEditSettings) {
      setEditIntervalSec(estate.heartbeatInterval);
      setEditGraceSec(estate.gracePeriod);
      setEditPauseSec(estate.pauseDuration);
      setEditLabel(estate.label);
    }
  }, [
    showEditSettings,
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
      setShowEditSettings(false);
      toast({ title: "Settings updated", description: "Estate config saved on-chain." });
      await fetchEstates();
    } catch (err: unknown) {
      toast({
        title: "Update failed",
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <>
      <div className="neo-card-static">
        <button
          onClick={() => setShowEditSettings(!showEditSettings)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-3">
            <div className="bg-accent-yellow neo-border rounded-xl p-3">
              <Settings className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <h3 className="font-black text-lg">Edit Settings</h3>
              <p className="text-sm font-medium text-muted-foreground">
                Update interval, grace, pause, or label.
              </p>
            </div>
          </div>
          <span className="text-2xl font-black">{showEditSettings ? "−" : "+"}</span>
        </button>
        {showEditSettings && (
          <div className="space-y-4 mt-4 pt-4 border-t-2 border-foreground/10">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                Label ({LABEL_MAX_LEN} chars max)
              </label>
              <div className="relative">
                <Pencil className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" strokeWidth={3} />
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value.slice(0, LABEL_MAX_LEN))}
                  maxLength={LABEL_MAX_LEN}
                  className="neo-input w-full !pl-10 focus:bg-accent-yellow/20"
                  placeholder="Estate label"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                  Interval (sec)
                </label>
                <input
                  type="number"
                  min={1}
                  value={editIntervalSec}
                  onChange={(e) => setEditIntervalSec(Math.max(1, Number(e.target.value)))}
                  className="neo-input w-full focus:bg-accent-yellow/20"
                />
                <p className="text-[11px] font-medium text-muted-foreground mt-1">
                  {formatDuration(editIntervalSec)}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                  Grace (sec)
                </label>
                <input
                  type="number"
                  min={1}
                  value={editGraceSec}
                  onChange={(e) => setEditGraceSec(Math.max(1, Number(e.target.value)))}
                  className="neo-input w-full focus:bg-accent-yellow/20"
                />
                <p className="text-[11px] font-medium text-muted-foreground mt-1">
                  {formatDuration(editGraceSec)}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                  Pause (sec)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editPauseSec}
                  onChange={(e) => setEditPauseSec(Math.max(0, Number(e.target.value)))}
                  className="neo-input w-full focus:bg-accent-yellow/20"
                />
                <p className="text-[11px] font-medium text-muted-foreground mt-1">
                  {formatDuration(editPauseSec)}
                </p>
              </div>
            </div>
            <Button
              variant="default"
              size="default"
              onClick={requestSaveSettings}
              disabled={savingSettings || !settingsDirty || !settingsValid}
              className="w-full"
            >
              {savingSettings ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Settings className="h-4 w-4" /> Save Changes</>
              )}
            </Button>
            {!labelValid && (
              <p className="text-xs font-bold text-accent-red">
                Label must be 1–{LABEL_MAX_LEN} characters.
              </p>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={settingsConfirmOpen}
        title="Save Settings?"
        description="Changing interval, grace, or pause shifts the heartbeat deadline. Make sure heirs are aware before saving."
        confirmLabel="Save"
        cancelLabel="Cancel"
        variant="default"
        loading={savingSettings}
        icon={<Settings className="h-6 w-6" strokeWidth={2.5} />}
        accent="bg-accent-yellow/20"
        onConfirm={performSaveSettings}
        onCancel={() => {
          if (!savingSettings) setSettingsConfirmOpen(false);
        }}
      >
        <div className="space-y-2 text-sm">
          {editLabel.trim() !== estate.label && (
            <div className="neo-border rounded-lg p-3 bg-secondary flex justify-between gap-3">
              <span className="font-bold">Label</span>
              <span className="font-mono text-xs text-right break-all">
                {estate.label} → <span className="font-black">{editLabel.trim()}</span>
              </span>
            </div>
          )}
          {editIntervalSec !== estate.heartbeatInterval && (
            <div className="neo-border rounded-lg p-3 bg-secondary flex justify-between gap-3">
              <span className="font-bold">Interval</span>
              <span className="text-xs text-right">
                {formatDuration(estate.heartbeatInterval)} →{" "}
                <span className="font-black">{formatDuration(editIntervalSec)}</span>
              </span>
            </div>
          )}
          {editGraceSec !== estate.gracePeriod && (
            <div className="neo-border rounded-lg p-3 bg-secondary flex justify-between gap-3">
              <span className="font-bold">Grace</span>
              <span className="text-xs text-right">
                {formatDuration(estate.gracePeriod)} →{" "}
                <span className="font-black">{formatDuration(editGraceSec)}</span>
              </span>
            </div>
          )}
          {editPauseSec !== estate.pauseDuration && (
            <div className="neo-border rounded-lg p-3 bg-secondary flex justify-between gap-3">
              <span className="font-bold">Pause</span>
              <span className="text-xs text-right">
                {formatDuration(estate.pauseDuration)} →{" "}
                <span className="font-black">{formatDuration(editPauseSec)}</span>
              </span>
            </div>
          )}
        </div>
      </ConfirmDialog>
    </>
  );
};

export default EditSettingsSection;
