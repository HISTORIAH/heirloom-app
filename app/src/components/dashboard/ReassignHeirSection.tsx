import { useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useToast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/utils";
import { Loader2, UserPlus } from "lucide-react";
import { useAnalytics } from "@/lib/analytics";

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const ReassignHeirSection: React.FC<Props> = ({ estate, onTx }) => {
  const { updateHeirOnChain, fetchEstates } = useVault();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const [showUpdateHeir, setShowUpdateHeir] = useState(false);
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
      setShowUpdateHeir(false);
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
      <div className="neo-card-static">
        <button
          onClick={() => setShowUpdateHeir(!showUpdateHeir)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-3">
            <div className="bg-accent-cyan neo-border rounded-xl p-3">
              <UserPlus className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <h3 className="font-black text-lg">Reassign Heir</h3>
              <p className="text-sm font-medium text-muted-foreground">
                Transfer estate to a different heir address.
              </p>
            </div>
          </div>
          <span className="text-2xl font-black">{showUpdateHeir ? "−" : "+"}</span>
        </button>
        {showUpdateHeir && (
          <div className="space-y-3 mt-4 pt-4 border-t-2 border-foreground/10">
            <input
              type="text"
              value={newHeirAddress}
              onChange={(e) => setNewHeirAddress(e.target.value)}
              maxLength={128}
              className="neo-input w-full font-mono text-sm focus:bg-accent-cyan/20"
              placeholder="New heir Solana address..."
            />
            <Button
              variant="default"
              size="default"
              onClick={handleUpdateHeir}
              disabled={updatingHeir || !newHeirAddress.trim()}
              className="w-full"
            >
              {updatingHeir ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Reassigning...</>
              ) : (
                <><UserPlus className="h-4 w-4" /> Reassign Heir</>
              )}
            </Button>
            <p className="text-xs font-medium text-muted-foreground">
              Warning: this moves the estate PDA + vault assets to the new heir. Old heir can no longer claim.
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={reassignConfirm.open}
        title="Reassign Heir?"
        description="The estate PDA and vault assets move to the new heir. The current heir can no longer claim."
        confirmLabel="Reassign"
        cancelLabel="Cancel"
        variant="default"
        loading={updatingHeir}
        icon={<UserPlus className="h-6 w-6" strokeWidth={2.5} />}
        accent="bg-accent-cyan/20"
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
          <div className="neo-border rounded-lg p-3 bg-accent-cyan/10">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">To</p>
            <p className="font-mono text-xs break-all">{reassignConfirm.next}</p>
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
};

export default ReassignHeirSection;
