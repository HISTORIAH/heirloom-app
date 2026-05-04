import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  explorerTxUrl,
  SOL_LABEL,
  SOL_DECIMALS,
  LABEL_MAX_LEN,
} from "@/config/constants";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { useWalletSplTokens } from "@/hooks/useWalletSplTokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import TokenAvatar from "@/components/TokenAvatar";
import ConfirmDialog from "@/components/ConfirmDialog";
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
  UserPlus,
  Settings,
  Pencil,
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

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

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

function computeTick(estate: EstateData, vaultEmpty: boolean): TickResult {
  if (estate.isClaimed || vaultEmpty) {
    return {
      state: "distributed",
      label: "Vault Distributed",
      countdown: { days: 0, hours: 0, minutes: 0, seconds: 0 },
    };
  }
  // Program sets last_heartbeat = clock.unix_timestamp on init (same as created_at).
  // Fallback to created_at only as a defensive measure.
  const anchor = estate.lastHeartbeat > 0 ? estate.lastHeartbeat : estate.createdAt;
  const now = Math.floor(Date.now() / 1000);
  const graceDeadline = anchor + estate.heartbeatInterval;
  const claimableDeadline = Math.max(
    graceDeadline + estate.gracePeriod,
    estate.pausedUntil,
  );

  let remaining: number;
  let state: UiState;
  let label: string;

  if (now >= claimableDeadline) {
    remaining = 0;
    state = "claimable";
    label = "Vault Is Claimable";
  } else if (now >= graceDeadline) {
    remaining = claimableDeadline - now;
    state = "grace";
    label = "Time Until Claimable";
  } else {
    remaining = graceDeadline - now;
    state = "active";
    label = "Next Heartbeat Due In";
  }

  remaining = Math.max(0, remaining);
  return {
    state,
    label,
    countdown: {
      days: Math.floor(remaining / 86400),
      hours: Math.floor((remaining % 86400) / 3600),
      minutes: Math.floor((remaining % 3600) / 60),
      seconds: remaining % 60,
    },
  };
}

const EstateCard = ({ estate }: { estate: EstateData }) => {
  const {
    sendHeartbeatOnChain,
    revokeEstateOnChain,
    updateHeirOnChain,
    updateEstateFieldsOnChain,
    registerAssetOnChain,
    registerSolOnChain,
    fetchEstates,
  } = useVault();
  const { publicKey, isConnected } = useWallet();
  const { toast } = useToast();
  const [sendingHeartbeat, setSendingHeartbeat] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [newHeirAddress, setNewHeirAddress] = useState("");
  const [updatingHeir, setUpdatingHeir] = useState(false);
  const [showUpdateHeir, setShowUpdateHeir] = useState(false);
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const [reassignConfirm, setReassignConfirm] = useState<{ open: boolean; next: string }>({
    open: false,
    next: "",
  });

  // Edit Settings state
  const [showEditSettings, setShowEditSettings] = useState(false);
  const [editIntervalSec, setEditIntervalSec] = useState(estate.heartbeatInterval);
  const [editGraceSec, setEditGraceSec] = useState(estate.gracePeriod);
  const [editPauseSec, setEditPauseSec] = useState(estate.pauseDuration);
  const [editLabel, setEditLabel] = useState(estate.label);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsConfirmOpen, setSettingsConfirmOpen] = useState(false);

  // Add Asset state
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [addAssetMint, setAddAssetMint] = useState<"sol" | string>("sol");
  const [addAssetAmount, setAddAssetAmount] = useState<number>(0);
  const [addingAsset, setAddingAsset] = useState(false);
  const { data: walletSplTokens, isLoading: walletTokensLoading } = useWalletSplTokens(
    isConnected && showAddAsset ? publicKey : null,
  );
  const { sol: walletSolBalance } = useTokenBalances(
    isConnected && showAddAsset ? publicKey : null,
  );
  const selectedToken = useMemo(
    () => (walletSplTokens ?? []).find((t) => t.mint === addAssetMint),
    [walletSplTokens, addAssetMint],
  );

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
        description: err instanceof Error ? err.message : "Transaction rejected",
        variant: "destructive",
      });
    } finally {
      setSendingHeartbeat(false);
    }
  };

  const performEmergencyWithdraw = async () => {
    setWithdrawing(true);
    try {
      const tx = await revokeEstateOnChain(estate.heir);
      setLastTxId(tx);
      setWithdrawConfirmOpen(false);
      toast({ title: "Emergency Withdraw", description: "Assets returned to your wallet." });
    } catch (err: unknown) {
      toast({
        title: "Withdraw Failed",
        description: err instanceof Error ? err.message : "Transaction rejected",
        variant: "destructive",
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const handleCopyHeir = () => {
    navigator.clipboard.writeText(estate.heir);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      setLastTxId(tx);
      setNewHeirAddress("");
      setShowUpdateHeir(false);
      setReassignConfirm({ open: false, next: "" });
      toast({ title: "Heir Updated", description: "Estate reassigned to new heir." });
      await fetchEstates();
    } catch (err: unknown) {
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Transaction rejected",
        variant: "destructive",
      });
    } finally {
      setUpdatingHeir(false);
    }
  };

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
      setLastTxId(tx);
      setSettingsConfirmOpen(false);
      setShowEditSettings(false);
      toast({ title: "Settings updated", description: "Estate config saved on-chain." });
      await fetchEstates();
    } catch (err: unknown) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Transaction rejected",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddAsset = async () => {
    if (addAssetAmount <= 0) return;
    setAddingAsset(true);
    try {
      let tx: string;
      if (addAssetMint === "sol") {
        const lamports = BigInt(Math.round(addAssetAmount * Math.pow(10, SOL_DECIMALS)));
        if (lamports <= 0n) throw new Error("Amount must be greater than zero");
        tx = await registerSolOnChain(estate.heir, lamports);
      } else {
        if (!selectedToken) throw new Error("Token not found in wallet");
        const amount = BigInt(
          Math.round(addAssetAmount * Math.pow(10, selectedToken.decimals)),
        );
        if (amount <= 0n) throw new Error("Amount must be greater than zero");
        tx = await registerAssetOnChain(estate.heir, {
          mint: addAssetMint,
          amount,
          decimals: selectedToken.decimals,
          tokenProgram: selectedToken.tokenProgram,
        });
      }
      setLastTxId(tx);
      setShowAddAsset(false);
      setAddAssetAmount(0);
      toast({ title: "Asset added", description: "Funds deposited into the vault." });
      await fetchEstates();
    } catch (err: unknown) {
      toast({
        title: "Add asset failed",
        description: err instanceof Error ? err.message : "Transaction rejected",
        variant: "destructive",
      });
    } finally {
      setAddingAsset(false);
    }
  };

  const config = statusConfig[computedState];
  const solDisplay = (estate.solBalance / Math.pow(10, SOL_DECIMALS)).toFixed(4);
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
                    {(Number(vt.amount) / Math.pow(10, vt.decimals)).toFixed(Math.min(6, vt.decimals))}
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
            <h3 className="text-xl font-black">Heirs (1)</h3>
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

      {/* Update Heir */}
      {computedState !== "distributed" && (
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
      )}

      {/* Edit Settings */}
      {computedState !== "distributed" && (
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
      )}

      {/* Add Asset */}
      {computedState !== "distributed" && (
        <div className="neo-card-static">
          <button
            onClick={() => setShowAddAsset(!showAddAsset)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-3">
              <div className="bg-accent-orange neo-border rounded-xl p-3">
                <Plus className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <h3 className="font-black text-lg">Add Asset</h3>
                <p className="text-sm font-medium text-muted-foreground">
                  Deposit more SOL or an SPL token into this vault.
                </p>
              </div>
            </div>
            <span className="text-2xl font-black">{showAddAsset ? "−" : "+"}</span>
          </button>
          {showAddAsset && (
            <div className="space-y-4 mt-4 pt-4 border-t-2 border-foreground/10">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                  Asset
                </label>
                <select
                  value={addAssetMint}
                  onChange={(e) => {
                    setAddAssetMint(e.target.value);
                    setAddAssetAmount(0);
                  }}
                  className="neo-input w-full font-bold"
                >
                  <option value="sol">{SOL_LABEL}</option>
                  {(walletSplTokens ?? []).map((t) => (
                    <option key={t.mint} value={t.mint}>
                      {t.label} — bal {t.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </option>
                  ))}
                </select>
                {walletTokensLoading && (
                  <p className="text-[11px] font-medium text-muted-foreground mt-1">
                    Scanning wallet for SPL tokens…
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  min={0}
                  step={1 / Math.pow(10, addAssetMint === "sol" ? Math.min(6, SOL_DECIMALS) : Math.min(6, selectedToken?.decimals ?? 9))}
                  value={addAssetAmount || ""}
                  onChange={(e) => setAddAssetAmount(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="neo-input w-full font-black text-2xl text-center"
                />
                <p className="text-[11px] font-medium text-muted-foreground mt-1">
                  {addAssetMint === "sol"
                    ? `Wallet balance: ${walletSolBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${SOL_LABEL}`
                    : selectedToken
                      ? `Wallet balance: ${selectedToken.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${selectedToken.label}`
                      : ""}
                </p>
              </div>
              <Button
                variant="default"
                size="default"
                onClick={handleAddAsset}
                disabled={addingAsset || addAssetAmount <= 0}
                className="w-full"
              >
                {addingAsset ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Depositing...</>
                ) : (
                  <><Plus className="h-4 w-4" /> Deposit</>
                )}
              </Button>
              <p className="text-xs font-medium text-muted-foreground">
                The asset is added to the existing vault — heirs will be able to claim it
                under the same heartbeat / grace rules.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Emergency */}
      {computedState !== "distributed" && (
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
      )}

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
