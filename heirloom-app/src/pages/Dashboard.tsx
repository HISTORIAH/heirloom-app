import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useVault } from "@/contexts/VaultContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { explorerTxUrl, TOKEN_A_LABEL, TOKEN_B_LABEL, TOKEN_A_DECIMALS, TOKEN_B_DECIMALS } from "@/config/constants";
import {
  Heart, Clock, Users, Shield, Coins, DollarSign, LogOut,
  AlertTriangle, ArrowLeft, Loader2, ExternalLink, Copy, Check,
} from "lucide-react";

const statusConfig: Record<string, { bg: string; label: string; description: string }> = {
  active: { bg: "neo-section-lime", label: "Active", description: "Heartbeat timer is running. All good." },
  grace: { bg: "bg-accent-yellow", label: "Grace Period", description: "Heartbeat missed. Send one before the grace period expires!" },
  claimable: { bg: "bg-accent-red", label: "Claimable", description: "Grace period expired. Heirs can now claim their shares." },
  distributed: { bg: "bg-secondary", label: "Distributed", description: "All assets have been distributed to heirs." },
};

const DashboardPage = () => {
  const { publicKey, disconnectWallet } = useWallet();
  const { vault, loading, pendingTxId, pendingCreate, sendHeartbeatOnChain, emergencyWithdrawOnChain, clearVault, fetchVault } = useVault();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sendingHeartbeat, setSendingHeartbeat] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [computedState, setComputedState] = useState<"active" | "grace" | "claimable" | "distributed">("active");
  const [countdownLabel, setCountdownLabel] = useState("Next Heartbeat Due In");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!vault) return;

    const tick = () => {
      if (vault.isDistributed) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setComputedState("distributed");
        setCountdownLabel("Vault Distributed");
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const graceDeadline = vault.lastHeartbeat + vault.heartbeatInterval;
      const pauseBonus = vault.guardianPauseUsed ? 2592000 : 0;
      const claimableDeadline = graceDeadline + vault.gracePeriod + pauseBonus;

      let remaining: number;
      if (now >= claimableDeadline) {
        remaining = 0;
        setComputedState("claimable");
        setCountdownLabel("Vault Is Claimable");
      } else if (now >= graceDeadline) {
        remaining = claimableDeadline - now;
        setComputedState("grace");
        setCountdownLabel("Time Until Claimable");
      } else {
        remaining = graceDeadline - now;
        setComputedState("active");
        setCountdownLabel("Next Heartbeat Due In");
      }

      remaining = Math.max(0, remaining);
      setCountdown({
        days: Math.floor(remaining / 86400),
        hours: Math.floor((remaining % 86400) / 3600),
        minutes: Math.floor((remaining % 3600) / 60),
        seconds: remaining % 60,
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [vault?.lastHeartbeat, vault?.heartbeatInterval, vault?.gracePeriod, vault?.isDistributed, vault?.guardianPauseUsed]);

  const handleHeartbeat = async () => {
    setSendingHeartbeat(true);
    try {
      const txId = await sendHeartbeatOnChain();
      setLastTxId(txId);
      toast({ title: "Heartbeat Sent!", description: "Your vault timer has been reset." });
      setTimeout(fetchVault, 5000);
    } catch (err: unknown) {
      toast({ title: "Heartbeat Failed", description: err instanceof Error ? err.message : "Transaction rejected", variant: "destructive" });
    } finally {
      setSendingHeartbeat(false);
    }
  };

  const handleEmergencyWithdraw = async () => {
    if (!confirm("Are you sure? This will return all assets and cancel the vault permanently.")) return;
    setWithdrawing(true);
    try {
      const txId = await emergencyWithdrawOnChain();
      setLastTxId(txId);
      toast({ title: "Emergency Withdraw", description: "Assets returned to your wallet." });
      setTimeout(fetchVault, 5000);
    } catch (err: unknown) {
      toast({ title: "Withdraw Failed", description: err instanceof Error ? err.message : "Transaction rejected", variant: "destructive" });
    } finally {
      setWithdrawing(false);
    }
  };

  const handleDisconnect = () => {
    clearVault();
    disconnectWallet();
    navigate("/");
  };

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading && !vault && !pendingCreate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="neo-card-static text-center max-w-md neo-slide-up">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" strokeWidth={2.5} />
          <h2 className="text-2xl font-black mb-3">Loading Vault...</h2>
          <p className="text-muted-foreground font-medium">Fetching on-chain data</p>
        </div>
      </div>
    );
  }

  if (!vault && pendingCreate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="neo-card-static text-center max-w-md neo-slide-up">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" strokeWidth={2.5} />
          <h2 className="text-2xl font-black mb-3">Vault Creation Pending</h2>
          <p className="text-muted-foreground font-medium mb-6">Waiting for your transaction to confirm on-chain...</p>
          {pendingTxId && (
            <a href={explorerTxUrl(pendingTxId)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 neo-badge bg-accent-cyan hover:bg-accent-cyan/80 transition-colors">
              View on Explorer <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="neo-card-static text-center max-w-md neo-slide-up">
          <div className="bg-accent-yellow neo-border rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black mb-3">No Vault Found</h2>
          <p className="text-muted-foreground font-medium mb-6">Create a vault first to see your dashboard.</p>
          <Button variant="lime" onClick={() => navigate("/create-vault")}>Create Vault</Button>
          <div className="border-t-4 border-foreground pt-6 mt-6">
            <p className="text-sm font-bold text-muted-foreground mb-3">Were you named as an heir?</p>
            <Button variant="orange" onClick={() => navigate("/claim")}>Claim Inheritance</Button>
          </div>
        </div>
      </div>
    );
  }

  const tokenADisplay = (vault.tokenABalance / Math.pow(10, TOKEN_A_DECIMALS)).toFixed(TOKEN_A_DECIMALS > 6 ? 8 : 4);
  const tokenBDisplay = (vault.tokenBBalance / Math.pow(10, TOKEN_B_DECIMALS)).toFixed(2);
  const config = statusConfig[computedState] || statusConfig.active;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-8 border-foreground bg-background sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-20">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-lg font-black hover:underline group">
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" strokeWidth={3} />Home
          </button>
          <span className="text-2xl font-black">Vault Dashboard</span>
          <button onClick={handleDisconnect} className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:underline">
            <LogOut className="h-4 w-4" strokeWidth={2.5} /><span className="hidden sm:inline">Disconnect</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8 neo-slide-up">
        <div className={`${config.bg} neo-border-thick rounded-2xl p-8 neo-shadow-xl`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="neo-badge bg-background mb-3 inline-block">Vault Status</span>
              <h2 className="text-4xl md:text-5xl font-black uppercase">{config.label}</h2>
              <p className="text-sm font-bold text-foreground/60 mt-1">{config.description}</p>
              <button onClick={handleCopyAddress} className="text-xs font-bold text-foreground/50 mt-2 font-mono flex items-center gap-1 hover:text-foreground/80 transition-colors">
                {publicKey}{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            {computedState !== "distributed" && (
              <Button variant="default" size="xl" onClick={handleHeartbeat} disabled={sendingHeartbeat} className={`shrink-0 ${computedState === "grace" ? "neo-shake" : ""}`}>
                {sendingHeartbeat ? <><Loader2 className="h-5 w-5 animate-spin" /> Signing...</> : <><Heart className="h-5 w-5" /> Send Heartbeat</>}
              </Button>
            )}
          </div>
        </div>

        {(lastTxId || pendingTxId) && (
          <div className="neo-card-static bg-accent-cyan/10 !p-5">
            <a href={explorerTxUrl(lastTxId || pendingTxId || "")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold hover:underline">
              <ExternalLink className="h-4 w-4" />View latest transaction on Explorer
            </a>
          </div>
        )}

        <div className="neo-card-static">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{countdownLabel}</h3>
            <Clock className="h-5 w-5 text-muted-foreground" strokeWidth={2.5} />
          </div>
          <div className="grid grid-cols-4 gap-3 md:gap-4">
            {[
              { label: "Days", value: countdown.days },
              { label: "Hours", value: countdown.hours },
              { label: "Min", value: countdown.minutes },
              { label: "Sec", value: countdown.seconds },
            ].map((unit) => (
              <div key={unit.label} className="text-center">
                <div className="neo-digit"><span className="text-4xl md:text-6xl font-black tabular-nums">{String(unit.value).padStart(2, "0")}</span></div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">{unit.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-foreground/10">
            <p className="text-sm font-bold text-muted-foreground">Last heartbeat: {vault.lastHeartbeat > 0 ? new Date(vault.lastHeartbeat * 1000).toLocaleString() : "N/A"}</p>
            {computedState === "grace" && <span className="neo-badge bg-accent-yellow text-xs animate-pulse-slow">Urgent</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="neo-card-static group hover:translate-y-[-2px] transition-transform duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent-orange neo-border rounded-xl p-3 transition-transform group-hover:rotate-[-4deg]"><Coins className="h-6 w-6" strokeWidth={2.5} /></div>
              <h3 className="font-black">{TOKEN_A_LABEL} Locked</h3>
            </div>
            <p className="text-3xl md:text-4xl font-black tabular-nums">{tokenADisplay}</p>
            <p className="text-sm font-bold text-muted-foreground">{vault.tokenABalance.toLocaleString()} raw units</p>
          </div>

          <div className="neo-card-static group hover:translate-y-[-2px] transition-transform duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent-cyan neo-border rounded-xl p-3 transition-transform group-hover:rotate-[-4deg]"><DollarSign className="h-6 w-6" strokeWidth={2.5} /></div>
              <h3 className="font-black">{TOKEN_B_LABEL} Locked</h3>
            </div>
            <p className="text-3xl md:text-4xl font-black tabular-nums">${tokenBDisplay}</p>
            <p className="text-sm font-bold text-muted-foreground">{vault.tokenBBalance.toLocaleString()} raw units</p>
          </div>

          <div className="neo-card-static group hover:translate-y-[-2px] transition-transform duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent-pink neo-border rounded-xl p-3 transition-transform group-hover:rotate-[-4deg]"><Clock className="h-6 w-6" strokeWidth={2.5} /></div>
              <h3 className="font-black">Parameters</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-sm font-bold">Interval</span><span className="font-black">{vault.heartbeatInterval >= 86400 ? `${Math.round(vault.heartbeatInterval / 86400)}d` : `${vault.heartbeatInterval}s`}</span></div>
              <div className="flex justify-between"><span className="text-sm font-bold">Grace</span><span className="font-black">{vault.gracePeriod >= 86400 ? `${Math.round(vault.gracePeriod / 86400)}d` : `${vault.gracePeriod}s`}</span></div>
              <div className="flex justify-between border-t-4 border-foreground pt-2 mt-2"><span className="text-sm font-bold">Total</span><span className="font-black">{(vault.heartbeatInterval + vault.gracePeriod) >= 86400 ? `${Math.round((vault.heartbeatInterval + vault.gracePeriod) / 86400)}d` : `${vault.heartbeatInterval + vault.gracePeriod}s`}</span></div>
            </div>
          </div>
        </div>

        <div className="neo-card-static">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-accent-yellow neo-border rounded-xl p-3"><Users className="h-6 w-6" strokeWidth={2.5} /></div>
              <h3 className="text-xl font-black">Heirs ({vault.heirs.length})</h3>
            </div>
            <span className="neo-badge bg-secondary text-xs">{vault.heirs.filter(h => h.hasClaimed).length} claimed</span>
          </div>
          <div className="space-y-3">
            {vault.heirs.map((h, i) => (
              <div key={i} className="flex items-center justify-between neo-border rounded-lg p-4 bg-secondary hover:bg-secondary/70 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="bg-foreground text-background neo-border rounded-full w-8 h-8 flex items-center justify-center text-sm font-black shrink-0">{i + 1}</span>
                  <div>
                    <p className="font-black text-lg">{h.label}</p>
                    <p className="text-xs font-mono text-muted-foreground">{h.address.slice(0, 8)}...{h.address.slice(-6)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-2xl">{(h.splitBps / 100).toFixed(0)}%</p>
                  <p className="text-xs font-bold text-muted-foreground">{((vault.tokenABalance / Math.pow(10, TOKEN_A_DECIMALS)) * h.splitBps / 10000).toFixed(4)} {TOKEN_A_LABEL}</p>
                  {vault.tokenBBalance > 0 && <p className="text-xs font-bold text-muted-foreground">${((vault.tokenBBalance / Math.pow(10, TOKEN_B_DECIMALS)) * h.splitBps / 10000).toFixed(2)} {TOKEN_B_LABEL}</p>}
                  {h.hasClaimed && <span className="neo-badge bg-accent-lime text-xs mt-1 inline-block">Claimed</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {vault.guardian && (
          <div className="neo-card-static bg-accent-purple/10">
            <div className="flex items-center gap-3">
              <div className="bg-accent-purple neo-border rounded-xl p-3"><Shield className="h-6 w-6 text-white" strokeWidth={2.5} /></div>
              <div>
                <p className="font-black">Guardian {vault.guardianPauseUsed ? "(Pause Used)" : "Active"}</p>
                <p className="text-sm font-mono text-muted-foreground">{vault.guardian}</p>
              </div>
            </div>
          </div>
        )}

        {computedState !== "distributed" && (
          <div className="neo-card-static border-accent-red">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-accent-red/20 neo-border rounded-xl p-3 shrink-0"><AlertTriangle className="h-6 w-6" strokeWidth={2.5} /></div>
                <div>
                  <h3 className="font-black text-lg">Emergency Withdraw</h3>
                  <p className="text-sm font-medium text-muted-foreground">Reclaim all assets and cancel the vault permanently.</p>
                </div>
              </div>
              <Button variant="destructive" size="default" onClick={handleEmergencyWithdraw} disabled={withdrawing}>
                {withdrawing ? <><Loader2 className="h-4 w-4 animate-spin" /> Withdrawing...</> : <><AlertTriangle className="h-4 w-4" /> Emergency Withdraw</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
