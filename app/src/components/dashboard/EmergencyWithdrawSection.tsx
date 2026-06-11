import { useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useToast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAnalytics } from "@/lib/analytics";

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const EmergencyWithdrawSection: React.FC<Props> = ({ estate, onTx }) => {
  const { revokeEstateOnChain } = useVault();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);

  const performEmergencyWithdraw = async () => {
    setWithdrawing(true);
    try {
      const tx = await revokeEstateOnChain(estate.heir);
      onTx(tx);
      setWithdrawConfirmOpen(false);
      track("emergency_withdraw_succeeded");
      toast({ title: "Emergency Withdraw", description: "Assets returned to your wallet." });
    } catch (err: unknown) {
      track("emergency_withdraw_failed", { stage: "transaction" });
      toast({
        title: "Withdraw Failed",
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <>
      <div className="neo-card-static border-accent-red">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-accent-red/20 neo-border rounded-xl p-3 shrink-0">
              <AlertTriangle className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-lg">Emergency Withdraw</h3>
              <p className="text-sm font-medium text-muted-foreground">
                Reclaim all assets and cancel the vault permanently.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="default"
            onClick={() => setWithdrawConfirmOpen(true)}
            disabled={withdrawing}
          >
            {withdrawing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Withdrawing...</>
            ) : (
              <><AlertTriangle className="h-4 w-4" /> Emergency Withdraw</>
            )}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={withdrawConfirmOpen}
        title="Emergency Withdraw?"
        description="This returns all SOL and tokens to your wallet and permanently cancels the vault. Heirs will no longer be able to claim."
        confirmLabel="Withdraw & Cancel"
        cancelLabel="Keep Vault"
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
