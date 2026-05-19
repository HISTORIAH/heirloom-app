import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Heart,
  Clock,
  AlertTriangle,
  Shield,
  Activity,
  Loader2,
  Copy,
  Check,
  Fingerprint,
  Globe,
  LogOut,
} from "lucide-react";
import { getHealth, getVaultBalance } from "@/services/api/vault";
import { getHeartbeatChallenge, postHeartbeat } from "@/services/api/heartbeat";
import { signHeartbeat } from "@/services/passkey";
import type { Vault, UiState, CountdownParts } from "@/types";
import { formatDuration, formatWei } from "@/lib/utils";

const statusConfig: Record<UiState, { bg: string; label: string; description: string }> = {
  active: {
    bg: "neo-section-lime",
    label: "Active",
    description: "Heartbeat timer is running. All good.",
  },
  grace: {
    bg: "bg-accent-yellow",
    label: "Grace Period",
    description: "Heartbeat missed. Check in with your passkey before grace expires!",
  },
  claimable: {
    bg: "bg-accent-red",
    label: "Claimable",
    description: "Grace expired. Your heir can now claim the ETH.",
  },
  distributed: {
    bg: "bg-secondary",
    label: "Distributed",
    description: "Vault has been claimed and closed.",
  },
};

function computeTick(vault: Vault): { state: UiState; label: string; countdown: CountdownParts } {
  if (vault.isClaimed) {
    return {
      state: "distributed",
      label: "Vault Distributed",
      countdown: { days: 0, hours: 0, minutes: 0, seconds: 0 },
    };
  }
  const now = Math.floor(Date.now() / 1000);
  const graceDeadline = vault.lastHeartbeat + vault.heartbeatInterval;
  const claimableDeadline = graceDeadline + vault.gracePeriod;

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

const VaultCard = ({
  vault,
  onHeartbeat,
  heartbeating,
  balanceWei,
}: {
  vault: Vault;
  onHeartbeat: (v: Vault) => Promise<void>;
  heartbeating: boolean;
  balanceWei?: string;
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const initial = useMemo(() => computeTick(vault), [vault]);
  const [countdown, setCountdown] = useState<CountdownParts>(initial.countdown);
  const [computedState, setComputedState] = useState<UiState>(initial.state);
  const [countdownLabel, setCountdownLabel] = useState(initial.label);

  useEffect(() => {
    const tick = () => {
      const r = computeTick(vault);
      setCountdown(r.countdown);
      setComputedState(r.state);
      setCountdownLabel(r.label);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [vault]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(vault.ethDepositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const config = statusConfig[computedState];
  const totalWindow = vault.heartbeatInterval + vault.gracePeriod;

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
              onClick={handleCopy}
              className="text-xs font-bold text-foreground/50 mt-2 font-mono flex items-center gap-1 hover:text-foreground/80 transition-colors break-all"
              title="Copy deposit address"
            >
              <span className="break-all">{vault.ethDepositAddress}</span>
              {copied ? <Check className="h-3 w-3 shrink-0" /> : <Copy className="h-3 w-3 shrink-0" />}
            </button>
          </div>
          {computedState !== "distributed" && (
            <Button
              variant="default"
              size="xl"
              onClick={() => onHeartbeat(vault)}
              disabled={heartbeating}
              className={`shrink-0 ${computedState === "grace" ? "neo-shake" : ""}`}
            >
              {heartbeating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Signing...
                </>
              ) : (
                <>
                  <Fingerprint className="h-5 w-5" /> Check In
                </>
              )}
            </Button>
          )}
        </div>
      </div>

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
            {vault.lastHeartbeat > 0
              ? new Date(vault.lastHeartbeat * 1000).toLocaleString()
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
              <Globe className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <h3 className="font-black">ETH Balance</h3>
          </div>
          <p className="text-3xl md:text-4xl font-black tabular-nums">
            {balanceWei != null ? formatWei(balanceWei) : "—"}
          </p>
          <p className="text-sm font-bold text-muted-foreground">ETH locked in vault</p>
        </div>

        <div className="neo-card-static group hover:translate-y-[-2px] transition-transform duration-150">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-accent-cyan neo-border rounded-xl p-3 transition-transform group-hover:rotate-[-4deg]">
              <Heart className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <h3 className="font-black">Label</h3>
          </div>
          <p className="text-3xl md:text-4xl font-black truncate">{vault.label}</p>
          {vault.estatePda && (
            <p className="text-sm font-bold text-muted-foreground break-all">
              {vault.estatePda.slice(0, 8)}...{vault.estatePda.slice(-6)}
            </p>
          )}
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
              <span className="font-black">{formatDuration(vault.heartbeatInterval)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-bold">Grace</span>
              <span className="font-black">{formatDuration(vault.gracePeriod)}</span>
            </div>
            <div className="flex justify-between border-t-4 border-foreground pt-2 mt-2">
              <span className="text-sm font-bold">Total</span>
              <span className="font-black">{formatDuration(totalWindow)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* dWallet info */}
      {vault.dwalletSolana && (
        <div className="neo-card-static bg-accent-purple/10">
          <div className="flex items-center gap-3">
            <div className="bg-accent-purple neo-border rounded-xl p-3">
              <Shield className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="font-black">Ika dWallet</p>
              <p className="text-sm font-mono text-muted-foreground break-all">{vault.dwalletSolana}</p>
              <p className="text-xs font-medium text-muted-foreground mt-1">
                MPC-controlled key — only signs when your passkey approves.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estate ID */}
      <div className="neo-card-static bg-accent-cyan/10">
        <div className="flex items-center gap-3">
          <div className="bg-accent-cyan neo-border rounded-xl p-3">
            <Fingerprint className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="font-black">Estate ID</p>
            <p className="text-sm font-mono text-muted-foreground break-all">{vault.estateId}</p>
          </div>
        </div>
      </div>

      {/* Withdraw action — only available before claim window opens */}
      {(computedState === "active" || computedState === "grace") && (
        <div className="neo-card-static">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-accent-yellow neo-border rounded-xl p-3 shrink-0">
                <Shield className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-black text-lg">Owner Withdraw</h3>
                <p className="text-sm font-medium text-muted-foreground">
                  Emergency exit — sign with your ETH wallet to pull funds back out.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={() => navigate(`/withdraw?estate=${vault.estateId}`)}
            >
              <Shield className="h-4 w-4" /> Withdraw
            </Button>
          </div>
        </div>
      )}

      {/* Claim CTA (when claimable) */}
      {computedState === "claimable" && !vault.isClaimed && (
        <div className="neo-card-static border-accent-red bg-accent-red/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-accent-red/20 neo-border rounded-xl p-3 shrink-0">
                <AlertTriangle className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-black text-lg">Heir Claim Available</h3>
                <p className="text-sm font-medium text-muted-foreground">
                  Grace expired — the heir can now claim the ETH.
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="default"
              onClick={() => navigate(`/claim?estate=${vault.estateId}`)}
            >
              <AlertTriangle className="h-4 w-4" /> Claim
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [ikaHealthy, setIkaHealthy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [heartbeating, setHeartbeating] = useState<string | null>(null);
  const [heartbeatError, setHeartbeatError] = useState<string | null>(null);
  const [lastHeartbeatOk, setLastHeartbeatOk] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    getHealth()
      .then((h) => {
        setBackendHealthy(h.backend === "ok");
        setIkaHealthy(h.ika_grpc === "ok");
      })
      .catch(() => {
        setBackendHealthy(false);
        setIkaHealthy(false);
      })
      .finally(() => setChecking(false));

    const vs: Vault[] = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
    setVaults(vs);

    // Fetch ETH balances for all vaults in the background.
    vs.forEach((v) => {
      getVaultBalance(v.estateId)
        .then((b) => setBalances((prev) => ({ ...prev, [v.estateId]: b.balance_wei })))
        .catch(() => {/* balance stays undefined — backend may be down */});
    });
  }, []);

  const handleHeartbeat = async (vault: Vault) => {
    setHeartbeating(vault.estateId);
    setHeartbeatError(null);
    setLastHeartbeatOk(null);

    try {
      const { challenge_b64 } = await getHeartbeatChallenge(vault.estateId);
      const assertion = await signHeartbeat(challenge_b64, "");

      await postHeartbeat({
        estate_id: vault.estateId,
        signature_b64: assertion.signatureB64,
        authenticator_data_b64: assertion.authenticatorDataB64,
        client_data_json: assertion.clientDataJson,
      });

      const vs: Vault[] = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
      const idx = vs.findIndex((v) => v.estateId === vault.estateId);
      if (idx >= 0) {
        vs[idx].lastHeartbeat = Math.floor(Date.now() / 1000);
        localStorage.setItem("heirloom_vaults", JSON.stringify(vs));
        setVaults([...vs]);
      }
      setLastHeartbeatOk(vault.estateId);
      setTimeout(() => setLastHeartbeatOk(null), 4000);
    } catch (err) {
      setHeartbeatError(err instanceof Error ? err.message : String(err));
    } finally {
      setHeartbeating(null);
    }
  };

  const handleClear = () => {
    if (!confirm("Forget all locally-stored vaults? (On-chain vaults are not affected.)")) return;
    localStorage.removeItem("heirloom_vaults");
    setVaults([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-8 border-foreground bg-background sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-20">
          <div className="flex items-center gap-2 text-lg font-black">
            <Heart className="h-5 w-5" strokeWidth={3} />
            Heirloom • IKA
          </div>
          <span className="hidden md:inline text-2xl font-black">Vault Dashboard</span>
          <div className="flex items-center gap-3">
            {checking ? (
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Checking…
              </span>
            ) : (
              <>
                {!backendHealthy && (
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <span className="h-2.5 w-2.5 rounded-full bg-accent-red" />
                    Backend Off
                  </span>
                )}
                {backendHealthy && ikaHealthy && (
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <span className="h-2.5 w-2.5 rounded-full bg-accent-lime" />
                    Live
                  </span>
                )}
                {backendHealthy && !ikaHealthy && (
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <span className="h-2.5 w-2.5 rounded-full bg-accent-yellow" />
                    IKA Off
                  </span>
                )}
              </>
            )}
            {vaults.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:underline"
                title="Forget local vaults"
              >
                <LogOut className="h-4 w-4" strokeWidth={2.5} />
                <span className="hidden sm:inline">Forget</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-10 neo-slide-up">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <span className="neo-badge bg-accent-lime mb-2 inline-block">Your ETH Vaults</span>
            <h2 className="text-4xl font-black">
              {vaults.length} vault{vaults.length !== 1 ? "s" : ""}
            </h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Passkey-secured, MPC-backed Ethereum estates.
            </p>
          </div>
          <Button variant="lime" size="lg" onClick={() => navigate("/create")}>
            <Plus className="h-5 w-5" /> New Vault
          </Button>
        </div>

        {heartbeatError && (
          <div className="neo-card-static bg-accent-red/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" strokeWidth={2.5} />
              <div className="min-w-0">
                <p className="font-black">Heartbeat failed</p>
                <p className="text-sm font-medium text-muted-foreground break-words">
                  {heartbeatError}
                </p>
              </div>
            </div>
          </div>
        )}

        {lastHeartbeatOk && (
          <div className="neo-card-static bg-accent-lime/20">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5" strokeWidth={2.5} />
              <p className="font-bold">Heartbeat confirmed on-chain.</p>
            </div>
          </div>
        )}

        {vaults.length === 0 && (
          <div className="neo-card-static text-center">
            <div className="bg-accent-yellow neo-border rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Heart className="h-10 w-10" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black mb-3">No Vaults Yet</h2>
            <p className="text-muted-foreground font-medium mb-6">
              Create your first ETH vault. No Solana wallet needed — only a passkey.
            </p>
            <Button variant="lime" onClick={() => navigate("/create")}>
              <Plus className="h-5 w-5" /> Create Vault
            </Button>
            <div className="border-t-4 border-foreground pt-6 mt-6">
              <p className="text-sm font-bold text-muted-foreground mb-3">
                Were you named as an heir?
              </p>
              <Button variant="orange" onClick={() => navigate("/claim")}>
                Claim Inheritance
              </Button>
            </div>
          </div>
        )}

        {vaults.map((v) => (
          <VaultCard
            key={v.estateId}
            vault={v}
            onHeartbeat={handleHeartbeat}
            heartbeating={heartbeating === v.estateId}
            balanceWei={balances[v.estateId]}
          />
        ))}
      </div>
    </div>
  );
}
