import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useToast } from "@/hooks/use-toast";
import { LABEL_MAX_LEN } from "@/lib/constants";
import { errMsg, formatDuration } from "@/lib/utils";
import { Pencil, X } from "lucide-react";

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const EditSettingsSection: React.FC<Props> = ({ estate, onTx }) => {
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
      <button
        onClick={() => setOpen(true)}
        className="neo-border rounded-xl px-4 py-3 bg-accent-cyan text-foreground font-bold text-sm text-center hover:opacity-90 transition-opacity"
      >
        Update Estate
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-6 overflow-y-auto text-foreground"
          onClick={() => {
            if (!savingSettings) setOpen(false);
          }}
        >
          <div className="neo-card-static max-w-md w-full neo-slide-up my-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-accent-cyan neo-border rounded-xl p-3 shrink-0">
                  <Pencil className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl leading-tight text-foreground">Update Estate</h3>
                  <p className="text-sm font-medium text-muted-foreground mt-1">
                    Adjust your check-in schedule, grace period, or estate label.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={savingSettings}
                className="neo-border rounded-lg p-2 bg-secondary hover:bg-secondary/70 transition-colors shrink-0 disabled:opacity-50"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1">
                  Label ({LABEL_MAX_LEN} chars max)
                </label>
                <div className="relative">
                  <Pencil className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" strokeWidth={3} />
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value.slice(0, LABEL_MAX_LEN))}
                    maxLength={LABEL_MAX_LEN}
                    className="neo-input w-full !pl-10 focus:bg-accent-cyan/20"
                    placeholder="Estate label"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1">
                    Interval (sec)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editIntervalSec}
                    onChange={(e) => setEditIntervalSec(Math.max(1, Number(e.target.value)))}
                    className="neo-input w-full focus:bg-accent-cyan/20"
                  />
                  <p className="text-[11px] font-medium text-muted-foreground mt-1">
                    {formatDuration(editIntervalSec)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1">
                    Grace (sec)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editGraceSec}
                    onChange={(e) => setEditGraceSec(Math.max(1, Number(e.target.value)))}
                    className="neo-input w-full focus:bg-accent-cyan/20"
                  />
                  <p className="text-[11px] font-medium text-muted-foreground mt-1">
                    {formatDuration(editGraceSec)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1">
                    Pause (sec)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editPauseSec}
                    onChange={(e) => setEditPauseSec(Math.max(0, Number(e.target.value)))}
                    className="neo-input w-full focus:bg-accent-cyan/20"
                  />
                  <p className="text-[11px] font-medium text-muted-foreground mt-1">
                    {formatDuration(editPauseSec)}
                  </p>
                </div>
              </div>
              {!labelValid && (
                <p className="text-xs font-bold text-accent-red">
                  Label must be 1–{LABEL_MAX_LEN} characters.
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t-2 border-foreground/10">
              <Button variant="outline" size="default" onClick={() => setOpen(false)} className="sm:w-auto w-full">
                Cancel
              </Button>
              <Button
                variant="cyan"
                size="default"
                onClick={requestSaveSettings}
                disabled={!settingsDirty || !settingsValid}
                className="sm:w-auto w-full"
              >
                <Pencil className="h-4 w-4" /> Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={settingsConfirmOpen}
        title="Update Estate?"
        description="Changing interval, grace, or pause shifts the heartbeat deadline. Make sure heirs are aware before saving."
        confirmLabel="Save"
        cancelLabel="Cancel"
        variant="default"
        loading={savingSettings}
        icon={<Pencil className="h-6 w-6" strokeWidth={2.5} />}
        accent="bg-accent-cyan/20"
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
                {estate.label} → <span className="font-bold">{editLabel.trim()}</span>
              </span>
            </div>
          )}
          {editIntervalSec !== estate.heartbeatInterval && (
            <div className="neo-border rounded-lg p-3 bg-secondary flex justify-between gap-3">
              <span className="font-bold">Interval</span>
              <span className="text-xs text-right">
                {formatDuration(estate.heartbeatInterval)} →{" "}
                <span className="font-bold">{formatDuration(editIntervalSec)}</span>
              </span>
            </div>
          )}
          {editGraceSec !== estate.gracePeriod && (
            <div className="neo-border rounded-lg p-3 bg-secondary flex justify-between gap-3">
              <span className="font-bold">Grace</span>
              <span className="text-xs text-right">
                {formatDuration(estate.gracePeriod)} →{" "}
                <span className="font-bold">{formatDuration(editGraceSec)}</span>
              </span>
            </div>
          )}
          {editPauseSec !== estate.pauseDuration && (
            <div className="neo-border rounded-lg p-3 bg-secondary flex justify-between gap-3">
              <span className="font-bold">Pause</span>
              <span className="text-xs text-right">
                {formatDuration(estate.pauseDuration)} →{" "}
                <span className="font-bold">{formatDuration(editPauseSec)}</span>
              </span>
            </div>
          )}
        </div>
      </ConfirmDialog>
    </>
  );
};

export default EditSettingsSection;
