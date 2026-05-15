import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { explorerTxUrl, SOL_LABEL } from "@/config/constants";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import TokenAvatar from "@/components/TokenAvatar";
import ReassignHeirSection from "@/components/dashboard/ReassignHeirSection";
import EditSettingsSection from "@/components/dashboard/EditSettingsSection";
import AddAssetSection from "@/components/dashboard/AddAssetSection";
import EmergencyWithdrawSection from "@/components/dashboard/EmergencyWithdrawSection";
import { formatDuration, formatSol, formatTokenAmount, errMsg } from "@/lib/utils";
import { computeEstateState } from "@/lib/estateState";
import {
  Heart,
  Clock,
  Users,
  Shield,
  Coins,
  LogOut,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Plus,
} from "lucide-react";

type UiState = "active" | "grace" | "claimable" | "distributed";

const statusConfig: Record<UiState, { bg: string; label: string; description: string }> = {
  active: {
    bg: "neo-section-lime",
    label: "Active",
    description: "Heartbeat timer is running. All good.",
  },
  grace: {
    bg: "bg-accent-yellow",
    label: "Grace Period",
    description: "Heartbeat missed. Send one before the grace period expires!",
  },
  claimable: {
    bg: "bg-accent-red",
    label: "Claimable",
    description: "Grace period expired. Heirs can now claim their shares.",
  },
  distributed: {
    bg: "bg-secondary",
    label: "Distributed",
    description: "All assets have been distributed to heirs.",
  },
};

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface TickResult {
  state: UiState;
  label: string;
  countdown: CountdownParts;
}

const LABELS: Record<UiState, string> = {
  distributed: "Vault Distributed",
  claimable: "Vault Is Claimable",
  grace: "Time Until Claimable",
  active: "Next Heartbeat Due In",
};

function computeTick(estate: EstateData, vaultEmpty: boolean): TickResult {
  const { state, secondsUntilGrace, secondsUntilClaimable } = computeEstateState({
    lastHeartbeat: estate.lastHeartbeat,
    heartbeatInterval: estate.heartbeatInterval,
    gracePeriod: estate.gracePeriod,
    pausedUntil: estate.pausedUntil,
    isClaimed: estate.isClaimed,
    createdAt: estate.createdAt,
    vaultEmpty,
  });

  const remaining =
    state === "active" ? secondsUntilGrace :
    state === "grace" ? secondsUntilClaimable :
    0;

  return {
    state,
    label: LABELS[state],
    countdown: {
      days: Math.floor(remaining / 86400),
      hours: Math.floor((remaining % 86400) / 3600),
      minutes: Math.floor((remaining % 3600) / 60),
      seconds: remaining % 60,
    },
  };
}

const EstateCard = ({ estate }: { estate: EstateData }) => {
  const { sendHeartbeatOnChain } = useVault();
  const { toast } = useToast();
  const [sendingHeartbeat, setSendingHeartbeat] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const vaultEmpty = estate.claimableAssets === 0 && estate.solBalance === 0 && estate.vaultTokens.length === 0;
  const vaultMints = estate.vaultTokens.map((vt) => vt.mint);
  const { metadata: tokenMeta } = useTokenMetadata(vaultMints);
  const initial = computeTick(estate, vaultEmpty);
  const [countdown, setCountdown] = useState<CountdownParts>(initial.countdown);
  const [computedState, setComputedState] = useState<UiState>(initial.state);
  const [countdownLabel, setCountdownLabel] = useState(initial.label);

  useEffect(() => {
    const tick = () => {
      const r = computeTick(estate, vaultEmpty);
      setCountdown(r.countdown);
      setComputedState(r.state);
      setCountdownLabel(r.label);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [
    estate.lastHeartbeat,
    estate.heartbeatInterval,
    estate.gracePeriod,
    estate.pausedUntil,
    estate.createdAt,
    estate.isClaimed,
    vaultEmpty,
    estate,
  ]);

  const handleHeartbeat = async () => {
    setSendingHeartbeat(true);
    try {
      const tx = await sendHeartbeatOnChain(estate.heir);
      setLastTxId(tx);
      toast({ title: "Heartbeat Sent!", description: "Your vault timer has been reset." });
    } catch (err: unknown) {
      toast({
        title: "Heartbeat Failed",
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setSendingHeartbeat(false);
    }
  };

  const handleCopyHeir = () => {
    navigator.clipboard.writeText(estate.heir);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const config = statusConfig[computedState];
  const solDisplay = formatSol(estate.solBalance);
  const tokenIcon = <Coins className="h-6 w-6" strokeWidth={2.5} />;
  const totalWindow = estate.heartbeatInterval + estate.gracePeriod;

  return (
    <div className="space-y-8">
      {/* Status banner */}
      <div className={`${config.bg} neo-border-thick rounded-2xl p-8 neo-shadow-xl`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="min-w-0">
            <span className="neo-badge bg-background mb-3 inline-block">Vault Status</span>
            <h2 className="text-4xl md:text-5xl font-black uppercase">{config.label}</h2>
            <p className="text-sm font-bold text-foreground/60 mt-1">{config.description}</p>
            <button
              onClick={handleCopyHeir}
              className="text-xs font-bold text-foreground/50 mt-2 font-mono flex items-center gap-1 hover:text-foreground/80 transition-colors break-all"
              title="Copy heir address"
            >
              <span className="break-all">{estate.heir}</span>
              {copied ? <Check className="h-3 w-3 shrink-0" /> : <Copy className="h-3 w-3 shrink-0" />}
            </button>
          </div>
          {computedState !== "distributed" && (
            <Button
              variant="default"
              size="xl"
              onClick={handleHeartbeat}
              disabled={sendingHeartbeat}
              className={`shrink-0 ${computedState === "grace" ? "neo-shake" : ""}`}
            >
              {sendingHeartbeat ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Signing...</>
              ) : (
                <><Heart className="h-5 w-5" /> Send Heartbeat</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Last tx link */}
      {lastTxId && (
        <div className="neo-card-static bg-accent-cyan/10 !p-5">
          <a
            href={explorerTxUrl(lastTxId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-bold hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View latest transaction on Explorer
          </a>
        </div>
      )}

      {/* Countdown */}
      <div className="neo-card-static">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {countdownLabel}
          </h3>
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
              <div className="neo-border rounded-xl bg-secondary p-4 md:p-6">
                <span className="text-4xl md:text-6xl font-black tabular-nums">
                  {String(unit.value).padStart(2, "0")}
                </span>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">
                {unit.label}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-foreground/10 flex-wrap gap-2">
          <p className="text-sm font-bold text-muted-foreground">
            Last heartbeat:{" "}
            {estate.lastHeartbeat > 0
              ? new Date(estate.lastHeartbeat * 1000).toLocaleString()
              : "N/A"}
          </p>
          {computedState === "grace" && (
            <span className="neo-badge bg-accent-yellow text-xs animate-pulse-slow">Urgent</span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="neo-card-static group hover:translate-y-[-2px] transition-transform duration-150">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-accent-orange neo-border rounded-xl p-3 transition-transform group-hover:rotate-[-4deg]">
              {tokenIcon}
            </div>
            <h3 className="font-black">{`${SOL_LABEL} Locked`}</h3>
          </div>
          <p className="text-3xl md:text-4xl font-black tabular-nums">{solDisplay}</p>
          <p className="text-sm font-bold text-muted-foreground">
            {`${estate.solBalance.toLocaleString()} lamports`}
          </p>
        </div>

        <div className="neo-card-static group hover:translate-y-[-2px] transition-transform duration-150">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-accent-cyan neo-border rounded-xl p-3 transition-transform group-hover:rotate-[-4deg]">
              <Heart className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <h3 className="font-black">Label</h3>
          </div>
          <p className="text-3xl md:text-4xl font-black truncate">{estate.label}</p>
          <p className="text-sm font-bold text-muted-foreground break-all">
            {estate.estatePda.slice(0, 8)}...{estate.estatePda.slice(-6)}
          </p>
        </div>

        <div className="neo-card-static group hover:translate-y-[-2px] transition-transform duration-150">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-accent-pink neo-border rounded-xl p-3 transition-transform group-hover:rotate-[-4deg]">
              <Clock className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <h3 className="font-black">Parameters</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-bold">Interval</span>
              <span className="font-black">{formatDuration(estate.heartbeatInterval)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-bold">Grace</span>
              <span className="font-black">{formatDuration(estate.gracePeriod)}</span>
            </div>
            <div className="flex justify-between border-t-4 border-foreground pt-2 mt-2">
              <span className="text-sm font-bold">Total</span>
              <span className="font-black">{formatDuration(totalWindow)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Token balances */}
      {estate.vaultTokens.length > 0 && (
        <div className="neo-card-static">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-accent-cyan neo-border rounded-xl p-3">
                <Coins className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black">Token Assets ({estate.vaultTokens.length})</h3>
            </div>
          </div>
          <div className="space-y-3">
            {estate.vaultTokens.map((vt) => {
              const meta = tokenMeta.get(vt.mint);
              const symbol = meta?.symbol;
              const name = meta?.name;
              const shortMint = `${vt.mint.slice(0, 4)}…${vt.mint.slice(-4)}`;
              const primary = symbol || name || shortMint;
              const secondary =
                name && name !== primary
                  ? name
                  : symbol
                    ? shortMint
                    : null;
              return (
                <div
                  key={vt.address}
                  className="flex items-center gap-4 neo-border rounded-lg p-4 bg-secondary"
                >
                  <TokenAvatar
                    image={meta?.image}
                    label={primary}
                    size="md"
                    accent="bg-accent-cyan"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-lg leading-tight truncate">{primary}</p>
                    {secondary && (
                      <p className="text-xs font-medium text-muted-foreground truncate mt-0.5">
                        {secondary}
                      </p>
                    )}
                  </div>
                  <span className="font-black text-lg tabular-nums shrink-0">
                    {formatTokenAmount(vt.amount, vt.decimals)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Heirs */}
      <div className="neo-card-static">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-accent-yellow neo-border rounded-xl p-3">
              <Users className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black">Heirs</h3>
          </div>
          <span className="neo-badge bg-secondary text-xs">
            {estate.isClaimed ? "1 claimed" : "0 claimed"}
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between neo-border rounded-lg p-4 bg-secondary hover:bg-secondary/70 transition-colors flex-wrap gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="bg-foreground text-background neo-border rounded-full w-8 h-8 flex items-center justify-center text-sm font-black shrink-0">
                1
              </span>
              <div className="min-w-0">
                <p className="font-black text-lg truncate">{estate.label}</p>
                <p className="text-xs font-mono text-muted-foreground truncate">
                  {estate.heir.slice(0, 12)}...{estate.heir.slice(-6)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-2xl">100%</p>
              <p className="text-xs font-bold text-muted-foreground">
                {solDisplay} {SOL_LABEL}
              </p>
              {estate.isClaimed && (
                <span className="neo-badge bg-accent-lime text-xs mt-1 inline-block">Claimed</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Guardian */}
      {estate.delegate && (
        <div className="neo-card-static bg-accent-purple/10">
          <div className="flex items-center gap-3">
            <div className="bg-accent-purple neo-border rounded-xl p-3">
              <Shield className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="font-black">Guardian {estate.isDeferred ? "(Pause Used)" : "Active"}</p>
              <p className="text-sm font-mono text-muted-foreground break-all">{estate.delegate}</p>
            </div>
          </div>
        </div>
      )}

      {/* Heartbeat Signer (read-only) */}
      {estate.hbSigner && (
        <div className="neo-card-static bg-accent-pink/10">
          <div className="flex items-center gap-3">
            <div className="bg-accent-pink neo-border rounded-xl p-3">
              <Heart className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="font-black">Heartbeat Signer</p>
              <p className="text-sm font-mono text-muted-foreground break-all">{estate.hbSigner}</p>
              <p className="text-xs font-medium text-muted-foreground mt-1">
                This wallet can refresh the heartbeat (no other rights).
              </p>
            </div>
          </div>
        </div>
      )}

      {computedState !== "distributed" && (
        <>
          <ReassignHeirSection estate={estate} onTx={setLastTxId} />
          <EditSettingsSection estate={estate} onTx={setLastTxId} />
          <AddAssetSection estate={estate} onTx={setLastTxId} />
          <EmergencyWithdrawSection estate={estate} onTx={setLastTxId} />
        </>
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
          <h2 className="text-2xl font-black mb-3">Loading Vault...</h2>
          <p className="text-muted-foreground font-medium">Fetching on-chain data</p>
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
          <span className="text-2xl font-black">Vault Dashboard</span>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:underline"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-10 neo-slide-up">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <span className="neo-badge bg-accent-lime mb-2 inline-block">Your Estates</span>
            <h2 className="text-4xl font-black">
              {estates.length} estate{estates.length !== 1 ? "s" : ""}
            </h2>
            <p className="text-xs font-mono text-muted-foreground mt-1 break-all">{publicKey}</p>
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
            <h2 className="text-2xl font-black mb-3">No Vault Found</h2>
            <p className="text-muted-foreground font-medium mb-6">
              Create a vault first to see your dashboard.
            </p>
            <Button variant="lime" onClick={() => navigate("/create-vault")}>
              Create Vault
            </Button>
            <div className="border-t-4 border-foreground pt-6 mt-6">
              <p className="text-sm font-bold text-muted-foreground mb-3">Were you named as an heir?</p>
              <Button variant="orange" onClick={() => navigate("/claim")}>
                Claim Inheritance
              </Button>
            </div>
          </div>
        )}

        {estates.map((e) => (
          <EstateCard key={e.estatePda} estate={e} />
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
