import { useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useToast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/utils";
import { UserPlus, X } from "lucide-react";
import { useAnalytics } from "@/contexts/AnalyticsContext";

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const ReassignHeirSection: React.FC<Props> = ({ estate, onTx }) => {
  const { updateHeirOnChain, fetchEstates } = useVault();
  const { toast } = useToast();
  const { track } = useAnalytics();
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
        title: "Same heir",
        description: "New heir address matches current heir.",
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
      toast({ title: "Heir Updated", description: "Estate reassigned to new heir." });
      await fetchEstates();
    } catch (err: unknown) {
      track("heir_reassign_failed", { stage: "transaction" });
      toast({
        title: "Update Failed",
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setUpdatingHeir(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="neo-border rounded-xl px-4 py-3 bg-accent-pink text-foreground font-bold text-sm text-center hover:opacity-90 transition-opacity"
      >
        Change Heir
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-6"
          onClick={() => {
            if (!updatingHeir) setOpen(false);
          }}
        >
          <div className="neo-card-static max-w-md w-full neo-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-accent-pink neo-border rounded-xl p-3 shrink-0">
                  <UserPlus className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black leading-tight text-foreground">Change Heir</h3>
                  <p className="text-sm font-medium text-muted-foreground mt-1">
                    Transfer estate to a different heir address.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={updatingHeir}
                className="neo-border rounded-lg p-2 bg-secondary hover:bg-secondary/70 transition-colors shrink-0 disabled:opacity-50"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            <div className="space-y-3 mt-4">
              <input
                type="text"
                value={newHeirAddress}
                onChange={(e) => setNewHeirAddress(e.target.value)}
                maxLength={128}
                className="neo-input w-full font-mono text-sm focus:bg-accent-pink/20"
                placeholder="New heir Solana address..."
              />
              <p className="text-xs font-medium text-muted-foreground">
                Warning: this moves the estate PDA + vault assets to the new heir. Old heir can no longer claim.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t-2 border-foreground/10">
              <Button variant="outline" size="default" onClick={() => setOpen(false)} className="sm:w-auto w-full">
                Cancel
              </Button>
              <Button
                variant="pink"
                size="default"
                onClick={handleUpdateHeir}
                disabled={!newHeirAddress.trim()}
                className="sm:w-auto w-full"
              >
                <UserPlus className="h-4 w-4" /> Change Heir
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={reassignConfirm.open}
        title="Change Heir?"
        description="The estate PDA and vault assets move to the new heir. The current heir can no longer claim."
        confirmLabel="Change Heir"
        cancelLabel="Cancel"
        variant="default"
        loading={updatingHeir}
        icon={<UserPlus className="h-6 w-6" strokeWidth={2.5} />}
        accent="bg-accent-pink/20"
        onConfirm={performUpdateHeir}
        onCancel={() => {
          if (!updatingHeir) setReassignConfirm({ open: false, next: "" });
        }}
      >
        <div className="space-y-2 text-sm">
          <div className="neo-border rounded-lg p-3 bg-secondary">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">From</p>
            <p className="font-mono text-xs break-all">{estate.heir}</p>
          </div>
          <div className="neo-border rounded-lg p-3 bg-accent-pink/10">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">To</p>
            <p className="font-mono text-xs break-all">{reassignConfirm.next}</p>
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
};

export default ReassignHeirSection;
