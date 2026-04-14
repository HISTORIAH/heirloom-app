import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { explorerTxUrl, SOL_LABEL, SOL_DECIMALS } from "@/config/constants";
import {
  Heart, Shield, Coins, LogOut, AlertTriangle,
  ArrowLeft, Loader2, ExternalLink, Plus, Trash2,
} from "lucide-react";

const statusConfig: Record<string, { bg: string; label: string; description: string }> = {
  active: { bg: "neo-section-lime", label: "Active", description: "Heartbeat timer running." },
  grace: { bg: "bg-accent-yellow", label: "Grace", description: "Heartbeat missed. Send one before claim window opens." },
  claimable: { bg: "bg-accent-red", label: "Claimable", description: "Heir can claim." },
  distributed: { bg: "bg-secondary", label: "Distributed", description: "Claimed or revoked." },
};

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

const EstateCard = ({ estate }: { estate: EstateData }) => {
  const { sendHeartbeatOnChain, revokeEstateOnChain } = useVault();
  const { toast } = useToast();
  const [sendingHeartbeat, setSendingHeartbeat] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const config = statusConfig[estate.state] || statusConfig.active;

  const handleHeartbeat = async () => {
    setSendingHeartbeat(true);
    try {
      const tx = await sendHeartbeatOnChain(estate.heir);
      setLastTx(tx);
      toast({ title: "Heartbeat sent", description: "Estate timer reset." });
    } catch (err: unknown) {
      toast({
        title: "Heartbeat failed",
        description: err instanceof Error ? err.message : "Rejected",
        variant: "destructive",
      });
    } finally {
      setSendingHeartbeat(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm(`Revoke estate for ${estate.label}? This returns assets and closes the vault.`)) return;
    setRevoking(true);
    try {
      const tx = await revokeEstateOnChain(estate.heir, estate.mint || undefined);
      setLastTx(tx);
      toast({ title: "Revoked", description: "Assets returned." });
    } catch (err: unknown) {
      toast({
        title: "Revoke failed",
        description: err instanceof Error ? err.message : "Rejected",
        variant: "destructive",
      });
    } finally {
      setRevoking(false);
    }
  };

  const solDisplay = (estate.solBalance / Math.pow(10, SOL_DECIMALS)).toFixed(4);

  return (
    <div className="neo-card-static space-y-5">
      <div className={`${config.bg} neo-border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <span className="neo-badge bg-background text-xs mb-2 inline-block">{config.label}</span>
          <h3 className="text-2xl font-black">{estate.label}</h3>
          <p className="text-xs font-mono text-foreground/60 break-all mt-1">{estate.heir}</p>
        </div>
        {estate.state !== "distributed" && (
          <Button
            variant="default"
            size="lg"
            onClick={handleHeartbeat}
            disabled={sendingHeartbeat}
            className={estate.state === "grace" ? "neo-shake shrink-0" : "shrink-0"}
          >
            {sendingHeartbeat ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Signing...</>
            ) : (
              <><Heart className="h-5 w-5" /> Heartbeat</>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="neo-border rounded-lg p-3 bg-secondary">
          <p className="text-xs font-bold text-muted-foreground uppercase">{SOL_LABEL} Locked</p>
          <p className="text-xl font-black tabular-nums">{solDisplay}</p>
        </div>
        <div className="neo-border rounded-lg p-3 bg-secondary">
          <p className="text-xs font-bold text-muted-foreground uppercase">Interval</p>
          <p className="text-xl font-black">{formatDuration(estate.heartbeatInterval)}</p>
        </div>
        <div className="neo-border rounded-lg p-3 bg-secondary">
          <p className="text-xs font-bold text-muted-foreground uppercase">Grace</p>
          <p className="text-xl font-black">{formatDuration(estate.gracePeriod)}</p>
        </div>
        <div className="neo-border rounded-lg p-3 bg-secondary">
          <p className="text-xs font-bold text-muted-foreground uppercase">
            {estate.state === "active" ? "Next HB" : estate.state === "grace" ? "Until claim" : "Status"}
          </p>
          <p className="text-xl font-black">
            {estate.state === "active"
              ? formatDuration(estate.secondsUntilGrace)
              : estate.state === "grace"
                ? formatDuration(estate.secondsUntilClaimable)
                : config.label}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t-2 border-foreground/10">
        <p className="text-xs font-bold text-muted-foreground">
          Last heartbeat:{" "}
          {estate.lastHeartbeat > 0 ? new Date(estate.lastHeartbeat * 1000).toLocaleString() : "N/A"}
        </p>
        {estate.delegate && (
          <span className="neo-badge bg-accent-purple/20 text-xs flex items-center gap-1">
            <Shield className="h-3 w-3" /> Delegate set
          </span>
        )}
      </div>

      {lastTx && (
        <a
          href={explorerTxUrl(lastTx)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-bold text-accent-cyan hover:underline"
        >
          <ExternalLink className="h-4 w-4" /> Last tx
        </a>
      )}

      {estate.state !== "distributed" && (
        <div className="pt-3 border-t-2 border-foreground/10">
          <Button variant="destructive" size="sm" onClick={handleRevoke} disabled={revoking}>
            {revoking ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Revoking...</>
            ) : (
              <><Trash2 className="h-4 w-4" /> Revoke estate</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

const DashboardPage = () => {
  const { publicKey, disconnectWallet } = useWallet();
  const { estates, loading, pendingCreate, pendingTxId, clearVault } = useVault();
  const navigate = useNavigate();

  const handleDisconnect = () => {
    clearVault();
    disconnectWallet();
    navigate("/");
  };

  if (loading && estates.length === 0 && !pendingCreate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="neo-card-static text-center max-w-md neo-slide-up">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" strokeWidth={2.5} />
          <h2 className="text-2xl font-black mb-3">Loading Estates...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-8 border-foreground bg-background sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-20">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-lg font-black hover:underline group">
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" strokeWidth={3} />
            Home
          </button>
          <span className="text-2xl font-black">Dashboard</span>
          <button onClick={handleDisconnect} className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:underline">
            <LogOut className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8 neo-slide-up">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="neo-badge bg-accent-lime mb-2 inline-block">Your Estates</span>
            <h2 className="text-4xl font-black">{estates.length} estate{estates.length !== 1 ? "s" : ""}</h2>
            <p className="text-xs font-mono text-muted-foreground mt-1">{publicKey}</p>
          </div>
          <Button variant="lime" size="lg" onClick={() => navigate("/create-vault")}>
            <Plus className="h-5 w-5" /> New Estate
          </Button>
        </div>

        {pendingCreate && (
          <div className="neo-card-static bg-accent-yellow/20">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="font-bold">Estate creation pending — waiting for on-chain confirmation...</p>
            </div>
            {pendingTxId && (
              <a
                href={explorerTxUrl(pendingTxId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-accent-cyan hover:underline flex items-center gap-1 mt-2"
              >
                View on Explorer <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {estates.length === 0 && !pendingCreate && (
          <div className="neo-card-static text-center">
            <div className="bg-accent-yellow neo-border rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black mb-3">No estates yet</h2>
            <p className="text-muted-foreground font-medium mb-6">
              Create your first heartbeat estate to start protecting assets.
            </p>
            <Button variant="lime" size="lg" onClick={() => navigate("/create-vault")}>
              <Coins className="h-5 w-5" /> Create Estate
            </Button>
            <div className="border-t-4 border-foreground pt-6 mt-6">
              <p className="text-sm font-bold text-muted-foreground mb-3">Named as an heir elsewhere?</p>
              <Button variant="orange" onClick={() => navigate("/claim")}>Claim Inheritance</Button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {estates.map((e) => (
            <EstateCard key={e.estatePda} estate={e} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
