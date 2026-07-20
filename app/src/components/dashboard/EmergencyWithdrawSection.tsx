import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useToast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAnalytics } from "@/contexts/AnalyticsContext";

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
      toast({ title: "Vault Closed", description: "Assets returned to your wallet." });
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
      <button
        onClick={() => setWithdrawConfirmOpen(true)}
        disabled={withdrawing}
        className="w-full neo-border rounded-xl h-12 bg-accent-red text-primary-foreground font-bold text-sm uppercase tracking-wide shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_hsl(var(--foreground))] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {withdrawing ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Withdrawing...</>
        ) : (
          <><AlertTriangle className="h-4 w-4" /> Close Estate & Withdraw</>
        )}
      </button>

      <ConfirmDialog
        open={withdrawConfirmOpen}
        title="Close Estate & Withdraw?"
        description="This returns all SOL and tokens to your wallet and permanently cancels the vault. Heir will no longer be able to claim."
        confirmLabel="Withdraw & Cancel"
        cancelLabel="Keep Estate"
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
