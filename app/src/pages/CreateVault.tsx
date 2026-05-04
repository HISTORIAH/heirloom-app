import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useVault } from "@/contexts/VaultContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  explorerTxUrl,
  SOL_LABEL,
  SOL_DECIMALS,
  LABEL_MAX_LEN,
} from "@/config/constants";
import { useWalletSplTokens } from "@/hooks/useWalletSplTokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import TokenAvatar from "@/components/TokenAvatar";
import WalletPill from "@/components/WalletPill";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Clock,
  Shield,
  Coins,
  User,
  CheckCircle,
  Loader2,
  ExternalLink,
  X,
  Search,
  ChevronDown,
  Pencil,
  ArrowUpDown,
} from "lucide-react";
import { formatUiAmount, toUiAmount } from "@/lib/utils";

const STEPS = ["Heartbeat", "Heir", "Deposit", "Review"];

type SubmitState = "idle" | "creating" | "complete" | "error";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  const d = Math.round(seconds / 86400);
  return `${d} day${d !== 1 ? "s" : ""}`;
}

const HEARTBEAT_PRESETS = [
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "30d", seconds: 30 * 86400 },
  { label: "60d", seconds: 60 * 86400 },
  { label: "90d", seconds: 90 * 86400 },
  { label: "180d", seconds: 180 * 86400 },
  { label: "365d", seconds: 365 * 86400 },
];

const GRACE_PRESETS = [
  { label: "15s", seconds: 15 },
  { label: "30s", seconds: 30 },
  { label: "7d", seconds: 7 * 86400 },
  { label: "14d", seconds: 14 * 86400 },
  { label: "30d", seconds: 30 * 86400 },
  { label: "60d", seconds: 60 * 86400 },
  { label: "90d", seconds: 90 * 86400 },
];

const PAUSE_PRESETS = [
  { label: "None", seconds: 0 },
  { label: "7d", seconds: 7 * 86400 },
  { label: "30d", seconds: 30 * 86400 },
];

const CreateVaultPage = () => {
  const { publicKey, isConnected } = useWallet();
  const { createEstateOnChain } = useVault();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0);

  const [heartbeatSeconds, setHeartbeatSeconds] = useState(90 * 86400);
  const [graceSeconds, setGraceSeconds] = useState(30 * 86400);
  const [pauseSeconds, setPauseSeconds] = useState(0);

  const [heirAddress, setHeirAddress] = useState("");
  const [label, setLabel] = useState("heir");
  const [delegate, setDelegate] = useState("");
  const [hbSigner, setHbSigner] = useState("");

  const { data: tokens, isLoading: tokensLoading } = useWalletSplTokens(isConnected ? publicKey : null);
  const { sol: solBalance, loading: solLoading } = useTokenBalances(isConnected ? publicKey : null);

  // Multi-asset state: SOL amount + per-token amounts
  const [solAmount, setSolAmount] = useState<number>(0);
  const [tokenAmounts, setTokenAmounts] = useState<Record<string, number>>({});

  // Presentational-only state for Step 3 token browser
  const [tokenSearch, setTokenSearch] = useState("");
  const [tokenSort, setTokenSort] = useState<"balance" | "name">("balance");
  const [activeMint, setActiveMint] = useState<string | null>(null);
  const [tokensPanelOpen, setTokensPanelOpen] = useState(true);
  const solSectionRef = useRef<HTMLDivElement | null>(null);

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [submitProgress, setSubmitProgress] = useState<string>("");

  const setTokenAmount = (mint: string, val: number) => {
    setTokenAmounts((prev) => ({ ...prev, [mint]: val }));
  };
  const removeToken = (mint: string) => {
    setTokenAmounts((prev) => {
      const next = { ...prev };
      delete next[mint];
      return next;
    });
  };

  const selectedTokenEntries = Object.entries(tokenAmounts).filter(([, v]) => v > 0);
  const hasAnyDeposit = solAmount > 0 || selectedTokenEntries.length > 0;

  const filteredTokens = useMemo(() => {
    const q = tokenSearch.trim().toLowerCase();
    let list = tokens ?? [];

    if (q) {
      list = list.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.name?.toLowerCase().includes(q) ||
          t.symbol?.toLowerCase().includes(q) ||
          t.mint.toLowerCase().includes(q),
      );
    }

    // Create the sorted copy
    return [...list].sort((a, b) => {
      if (tokenSort === "balance") {
        // Sort by amount descending
        // If amounts are the same, fallback to alphabetical so the UI is stable
        const diff = b.uiAmount - a.uiAmount;
        return diff !== 0 ? diff : a.label.localeCompare(b.label);
      }

      // Default: Sort by label alphabetically
      return a.label.localeCompare(b.label);
    });
  }, [tokens, tokenSearch, tokenSort]);

  const setSolByPercent = (pct: number) => {
    const factorDec = Math.min(SOL_DECIMALS, 9);
    const factor = Math.pow(10, factorDec);
    const v = Math.floor(solBalance * (pct / 100) * factor) / factor;
    setSolAmount(Math.max(0, v));
  };

  const setTokenByPercent = (mint: string, pct: number) => {
    const tok = (tokens ?? []).find((t) => t.mint === mint);
    if (!tok) return;
    const target = tok.uiAmount * (pct / 100);
    const factorDec = Math.min(tok.decimals, 9);
    const factor = Math.pow(10, factorDec);
    const v = Math.min(tok.uiAmount, Math.floor(target * factor) / factor);
    if (v <= 0) removeToken(mint);
    else setTokenAmount(mint, v);
  };

  const editToken = (mint: string) => {
    setActiveMint(mint);
    setTokensPanelOpen(true);
    setTokenSearch("");
    setTimeout(() => {
      document
        .getElementById(`token-row-${mint}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  const editSol = () => {
    solSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    solSectionRef.current?.querySelector("input")?.focus();
  };

  const heartbeatSliderDays = Math.max(1, Math.round(heartbeatSeconds / 86400));
  const graceSliderDays = Math.max(1, Math.round(graceSeconds / 86400));

  const isHeirValid = heirAddress.trim().length > 0 && label.trim().length > 0 && label.length <= LABEL_MAX_LEN;
  const canProceed = () => {
    if (step === 0) return heartbeatSeconds > 0 && graceSeconds > 0;
    if (step === 1) return isHeirValid;
    if (step === 2) return hasAnyDeposit;
    return true;
  };

  const handleSubmit = async () => {
    if (!isConnected) {
      toast({ title: "Connect wallet first", variant: "destructive" });
      return;
    }
    try {
      setSubmitState("creating");
      const lamports = BigInt(Math.round(solAmount * Math.pow(10, SOL_DECIMALS)));

      // Build token deposits list
      const tokenDeposits = selectedTokenEntries.map(([mint, amt]) => {
        const tok = (tokens ?? []).find((t) => t.mint === mint);
        const decimals = tok?.decimals ?? 9;
        return {
          mint,
          amount: BigInt(Math.round(amt * Math.pow(10, decimals))),
          decimals,
          tokenProgram: tok?.tokenProgram,
        };
      });

      setSubmitProgress(
        tokenDeposits.length > 0
          ? `Creating estate + registering ${tokenDeposits.length} token(s)...`
          : "Creating estate...",
      );

      const createTxId = await createEstateOnChain({
        heir: heirAddress.trim(),
        label: label.trim().slice(0, LABEL_MAX_LEN),
        heartbeatInterval: heartbeatSeconds,
        gracePeriod: graceSeconds,
        pauseDuration: pauseSeconds,
        amountLamports: lamports,
        delegate: delegate.trim() || undefined,
        hbSigner: hbSigner.trim() || undefined,
        tokens: tokenDeposits,
      });
      setTxId(createTxId);
      setSubmitState("complete");
      toast({ title: "Estate Created!", description: "Your heartbeat vault is live on-chain." });
      setTimeout(() => navigate("/dashboard"), 3000);
    } catch (err: unknown) {
      setSubmitState("error");
      toast({
        title: "Transaction Failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const isSubmitting = submitState === "creating" || submitState === "complete";

  return (
    <>
    <div
      className="min-h-screen bg-background"
      aria-hidden={isSubmitting}
      style={isSubmitting ? { pointerEvents: "none" } : undefined}
    >
      <div className="border-b-8 border-foreground bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-20">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-lg font-black hover:underline group"
          >
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" strokeWidth={3} />
            Back
          </button>
          <span className="text-2xl font-black">Create Estate</span>
          <WalletPill />

        </div>
      </div>

      <div className="bg-secondary border-b-4 border-foreground">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`neo-step-dot ${i < step ? "complete" : i === step ? "active" : "pending"}`}>
                    {i < step ? <CheckCircle className="h-5 w-5" strokeWidth={3} /> : i + 1}
                  </div>
                  <p
                    className={`text-xs font-bold uppercase tracking-widest mt-2 text-center ${
                      i === step ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-1 flex-1 neo-border rounded-full -mt-6 mx-1 ${
                      i < step ? "bg-accent-lime" : "bg-secondary"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="neo-slide-up" key={step}>
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <span className="neo-badge bg-accent-pink mb-4 inline-block">Step 1</span>
                <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                  Set your <span className="bg-accent-pink px-2 inline-block rotate-[-1deg]">heartbeat.</span>
                </h2>
                <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
                  How often will you check in? If you miss a heartbeat, the grace period starts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="neo-card-static">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-accent-pink neo-border rounded-xl p-3">
                      <Heart className="h-6 w-6" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-black">Heartbeat Interval</h3>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="range"
                      min={1}
                      max={365}
                      value={heartbeatSliderDays}
                      onChange={(e) => setHeartbeatSeconds(Number(e.target.value) * 86400)}
                      className="w-full h-3 bg-secondary neo-border rounded-full appearance-none cursor-pointer accent-accent-pink"
                    />
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                        {heartbeatSeconds < 86400 ? "Seconds" : "Days"}
                      </span>
                      <span className="text-5xl font-black tabular-nums">
                        {heartbeatSeconds < 86400 ? heartbeatSeconds : Math.round(heartbeatSeconds / 86400)}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {HEARTBEAT_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          onClick={() => setHeartbeatSeconds(p.seconds)}
                          className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] ${
                            heartbeatSeconds === p.seconds ? "bg-accent-pink neo-shadow-sm" : "bg-secondary hover:bg-accent-pink/30"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="neo-card-static">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-accent-yellow neo-border rounded-xl p-3">
                      <Clock className="h-6 w-6" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-black">Grace Period</h3>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="range"
                      min={1}
                      max={90}
                      value={graceSliderDays}
                      onChange={(e) => setGraceSeconds(Number(e.target.value) * 86400)}
                      className="w-full h-3 bg-secondary neo-border rounded-full appearance-none cursor-pointer accent-accent-yellow"
                    />
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                        {graceSeconds < 86400 ? "Seconds" : "Days"}
                      </span>
                      <span className="text-5xl font-black tabular-nums">
                        {graceSeconds < 86400 ? graceSeconds : Math.round(graceSeconds / 86400)}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {GRACE_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          onClick={() => setGraceSeconds(p.seconds)}
                          className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] ${
                            graceSeconds === p.seconds ? "bg-accent-yellow neo-shadow-sm" : "bg-secondary hover:bg-accent-yellow/30"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="neo-card-static">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-accent-purple neo-border rounded-xl p-3">
                    <Shield className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-black">Guardian Pause Window</h3>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  How long a guardian can pause the claim once (0 = no guardian pause).
                </p>
                <div className="flex gap-2 flex-wrap">
                  {PAUSE_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setPauseSeconds(p.seconds)}
                      className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 ${
                        pauseSeconds === p.seconds ? "bg-accent-purple text-white neo-shadow-sm" : "bg-secondary"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="neo-card-static bg-accent-lime/30 flex items-center gap-4">
                <div className="bg-accent-lime neo-border rounded-xl p-3 shrink-0">
                  <Clock className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <p className="text-base font-bold leading-snug">
                  Total deadline:{" "}
                  <span className="text-xl font-black">
                    {formatDuration(heartbeatSeconds + graceSeconds)}
                  </span>
                  {" "}— if you don't check in for this long, your heirs can claim.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8">
              <div>
                <span className="neo-badge bg-accent-cyan mb-4 inline-block">Step 2</span>
                <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                  Name your <span className="bg-accent-cyan px-2 inline-block rotate-[1deg]">heir.</span>
                </h2>
                <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
                  One estate, one heir. Create more estates later to cover more people.
                </p>
              </div>

              <div className="neo-card-static">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-accent-cyan neo-border rounded-xl p-3">
                    <User className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-black">Heir</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                      Label ({LABEL_MAX_LEN} chars max)
                    </label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value.slice(0, LABEL_MAX_LEN))}
                      maxLength={LABEL_MAX_LEN}
                      className="neo-input focus:bg-accent-cyan/20"
                      placeholder="e.g. son"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                      Heir Solana Address
                    </label>
                    <input
                      type="text"
                      value={heirAddress}
                      onChange={(e) => setHeirAddress(e.target.value)}
                      maxLength={128}
                      className="neo-input font-mono text-sm focus:bg-accent-cyan/20"
                      placeholder="Enter Solana wallet address..."
                    />
                  </div>
                </div>
              </div>

              <div className="neo-card-static">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-accent-purple neo-border rounded-xl p-3">
                    <Shield className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-black">Guardian (Optional)</h3>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  A trusted address that can pause the claim window once.
                </p>
                <input
                  type="text"
                  value={delegate}
                  onChange={(e) => setDelegate(e.target.value)}
                  maxLength={128}
                  className="neo-input font-mono text-sm focus:bg-accent-purple/20"
                  placeholder="Solana address (leave empty for no guardian)"
                />
              </div>

              <div className="neo-card-static">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-accent-pink neo-border rounded-xl p-3">
                    <Heart className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-black">Heartbeat Signer (Optional)</h3>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  A hot wallet that can refresh the heartbeat for you. It cannot
                  change settings, revoke, or reassign — only ping.
                </p>
                <input
                  type="text"
                  value={hbSigner}
                  onChange={(e) => setHbSigner(e.target.value)}
                  maxLength={128}
                  className="neo-input font-mono text-sm focus:bg-accent-pink/20"
                  placeholder="Solana address (leave empty to keep heartbeats authority-only)"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div>
                <span className="neo-badge bg-accent-orange mb-4 inline-block">Step 3</span>
                <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                  Fund your <span className="bg-accent-orange px-2 inline-block rotate-[-1deg]">vault.</span>
                </h2>
                <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
                  Deposit SOL and/or multiple SPL tokens into the vault.
                </p>
              </div>

              {/* SOL deposit — percent-based, mirrors SPL token UI */}
              <div ref={solSectionRef} className="neo-card-static">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-accent-orange neo-border rounded-xl p-3">
                    <Coins className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black">{SOL_LABEL}</h3>
                    <p className="text-xs font-bold text-muted-foreground">
                      Amount in SOL ({SOL_DECIMALS} decimals)
                    </p>
                  </div>
                  {isConnected && (
                    <p className="text-sm font-bold text-muted-foreground tabular-nums shrink-0">
                      {solLoading
                        ? "Bal …"
                        : `Bal ${solBalance.toLocaleString(undefined, {
                            maximumFractionDigits: Math.min(6, SOL_DECIMALS),
                          })}`}
                    </p>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  max={solBalance}
                  step={1 / Math.pow(10, Math.min(6, SOL_DECIMALS))}
                  value={solAmount || ""}
                  onChange={(e) => {
                    const v = Math.max(0, Number(e.target.value));
                    setSolAmount(v);
                  }}
                  placeholder="0"
                  aria-label={`${SOL_LABEL} amount`}
                  className="neo-input font-black text-3xl text-center !py-4"
                />
                <div className="flex gap-2 flex-wrap mt-4">
                  <button
                    onClick={() => setSolAmount(0)}
                    className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 ${
                      solAmount <= 0
                        ? "bg-accent-orange neo-shadow-sm"
                        : "bg-secondary hover:bg-accent-pink/40"
                    }`}
                  >
                    Skip
                  </button>
                  {[25, 50, 75].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setSolByPercent(pct)}
                      disabled={!isConnected || solBalance <= 0}
                      className="neo-border rounded-lg px-3 py-1 text-sm font-bold bg-secondary hover:bg-accent-orange/40 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pct}%
                    </button>
                  ))}
                  <button
                    onClick={() => setSolByPercent(100)}
                    disabled={!isConnected || solBalance <= 0}
                    className="neo-border rounded-lg px-3 py-1 text-sm font-bold bg-accent-orange hover:neo-shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Selected deposits summary */}
              {(solAmount > 0 || selectedTokenEntries.length > 0) && (
                <div className="neo-card-static !p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black uppercase tracking-widest">
                      Selected Deposits
                    </h3>
                    <span className="neo-badge bg-accent-lime !px-3 !py-0.5 !text-xs">
                      {selectedTokenEntries.length + (solAmount > 0 ? 1 : 0)}
                    </span>
                  </div>
                  <ul className="divide-y-2 divide-foreground/10">
                    {solAmount > 0 && (
                      <li className="flex items-center gap-3 py-2.5">
                        <div className="bg-accent-orange neo-border rounded-lg p-1.5 shrink-0">
                          <Coins className="h-4 w-4" strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-base truncate">{SOL_LABEL}</p>
                        </div>
                        <span className="font-black tabular-nums text-base">
                          {solAmount.toLocaleString(undefined, {
                            maximumFractionDigits: Math.min(6, SOL_DECIMALS),
                          })}
                        </span>
                        <button
                          onClick={editSol}
                          aria-label={`Edit ${SOL_LABEL}`}
                          className="neo-border rounded-lg p-1.5 bg-secondary hover:bg-accent-yellow transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={3} />
                        </button>
                        <button
                          onClick={() => setSolAmount(0)}
                          aria-label={`Remove ${SOL_LABEL}`}
                          className="neo-border rounded-lg p-1.5 bg-secondary hover:bg-accent-pink transition-colors"
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={3} />
                        </button>
                      </li>
                    )}
                    {selectedTokenEntries.map(([mint, amt]) => {
                      const tok = (tokens ?? []).find((t) => t.mint === mint);
                      const tokLabel = tok?.label ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`;
                      const tokName = tok?.name;
                      const dec = tok?.decimals ?? 9;
                      return (
                        <li key={mint} className="flex items-center gap-3 py-2.5">
                          <TokenAvatar
                            image={tok?.image}
                            label={tokLabel}
                            accent="bg-accent-cyan"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-base truncate">{tokLabel}</p>
                            {tokName && tokName !== tokLabel && (
                              <p className="text-[11px] font-medium text-muted-foreground truncate">
                                {tokName}
                              </p>
                            )}
                          </div>
                          <span className="font-black tabular-nums text-base">
                            {amt.toLocaleString(undefined, {
                              maximumFractionDigits: Math.min(6, dec),
                            })}
                          </span>
                          <button
                            onClick={() => editToken(mint)}
                            aria-label={`Edit ${tokLabel}`}
                            className="neo-border rounded-lg p-1.5 bg-secondary hover:bg-accent-yellow transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={3} />
                          </button>
                          <button
                            onClick={() => removeToken(mint)}
                            aria-label={`Remove ${tokLabel}`}
                            className="neo-border rounded-lg p-1.5 bg-secondary hover:bg-accent-pink transition-colors"
                          >
                            <X className="h-3.5 w-3.5" strokeWidth={3} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* SPL token browser — collapsible, searchable, fixed-height */}
              {tokensLoading && (
                <div className="neo-card-static flex items-center gap-3 !p-5">
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                  <span className="font-bold">Scanning wallet for SPL tokens…</span>
                </div>
              )}

              {!tokensLoading && (tokens ?? []).length === 0 && (
                <p className="text-sm font-medium text-muted-foreground">
                  No SPL tokens with balance found in your wallet. Funding with {SOL_LABEL}.
                </p>
              )}

              {!tokensLoading && (tokens ?? []).length > 0 && (
                <div className="neo-card-static !p-0 overflow-hidden">
                  <button
                    onClick={() => setTokensPanelOpen((v) => !v)}
                    aria-expanded={tokensPanelOpen}
                    aria-controls="spl-token-panel"
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-accent-lime neo-border rounded-lg p-2">
                        <Coins className="h-5 w-5" strokeWidth={2.5} />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-black leading-tight">SPL Tokens</h3>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          {(tokens ?? []).length} available · {selectedTokenEntries.length} selected
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 transition-transform ${tokensPanelOpen ? "rotate-180" : ""}`}
                      strokeWidth={3}
                    />
                  </button>

                  {tokensPanelOpen && (
                    <div id="spl-token-panel" className="border-t-4 border-foreground">
                      <div className="flex items-center gap-3 p-4 bg-secondary/40 border-b-4 border-foreground">
                        <div className="relative flex-1">
                          <Search
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                            strokeWidth={3}
                          />
                          <input
                            type="text"
                            value={tokenSearch}
                            onChange={(e) => setTokenSearch(e.target.value)}
                            placeholder="Search token or mint…"
                            aria-label="Search tokens"
                            className="neo-input !pl-10 !py-3 text-sm"
                          />
                        </div>
                        <button
                          onClick={() =>
                            setTokenSort((s) => (s === "balance" ? "name" : "balance"))
                          }
                          aria-label={`Sort by ${tokenSort === "balance" ? "name" : "balance"}`}
                          className="neo-border rounded-lg px-4 py-3 text-xs font-black uppercase tracking-widest bg-background hover:bg-accent-yellow transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={3} />
                          {tokenSort === "balance" ? "Bal" : "Name"}
                        </button>
                      </div>

                      <div
                        role="listbox"
                        aria-label="SPL tokens"
                        className="max-h-[420px] overflow-y-auto divide-y-2 divide-foreground/10"
                      >
                        {filteredTokens.length === 0 && (
                          <p className="text-sm font-medium text-muted-foreground px-5 py-6 text-center">
                            No tokens match “{tokenSearch}”.
                          </p>
                        )}
                        {filteredTokens.map((t) => {
                          const amount = tokenAmounts[t.mint] ?? 0;
                          const isActive = amount > 0;
                          const isOpen = activeMint === t.mint;
                          const dec = Math.min(6, t.decimals);
                          return (
                            <div
                              key={t.mint}
                              id={`token-row-${t.mint}`}
                              className={isActive ? "bg-accent-lime/15" : ""}
                            >
                              <button
                                role="option"
                                aria-selected={isActive}
                                aria-expanded={isOpen}
                                onClick={() =>
                                  setActiveMint(isOpen ? null : t.mint)
                                }
                                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-accent-yellow/30 transition-colors text-left"
                              >
                                <TokenAvatar
                                  image={t.image}
                                  label={t.label}
                                  size="md"
                                  accent={isActive ? "bg-accent-lime" : "bg-secondary"}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-black text-lg leading-tight truncate">{t.label}</p>
                                  <p className="text-xs font-medium text-muted-foreground truncate mt-0.5">
                                    {t.name && t.name !== t.label
                                      ? t.name
                                      : `${t.mint.slice(0, 8)}…${t.mint.slice(-4)}`}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  {isActive && (
                                    <p className="text-xs font-black uppercase tracking-widest text-foreground">
                                      {/*+{amount.toLocaleString(undefined, { maximumFractionDigits: dec })}*/}
                                      {formatUiAmount(amount)}
                                    </p>
                                  )}
                                  <p className="text-sm font-bold text-muted-foreground tabular-nums">
                                    {formatUiAmount(t.uiAmount)}
                                  </p>
                                </div>
                                <ChevronDown
                                  className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                  strokeWidth={3}
                                />
                              </button>

                              {isOpen && (
                                <div className="px-4 pb-4 pt-1 space-y-3 bg-background/50">
                                  <input
                                    type="number"
                                    min={0}
                                    max={t.uiAmount}
                                    step={1 / Math.pow(10, dec)}
                                    value={amount || ""}
                                    onChange={(e) => {
                                      const v = Math.max(0, Number(e.target.value));
                                      if (v === 0) removeToken(t.mint);
                                      else setTokenAmount(t.mint, v);
                                    }}
                                    placeholder="0"
                                    aria-label={`${t.label} amount`}
                                    className="neo-input font-black text-2xl text-center !py-3"
                                  />
                                  <div className="flex gap-2 flex-wrap">
                                    <button
                                      onClick={() => removeToken(t.mint)}
                                      className={`neo-border rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-widest transition-all duration-150 ${
                                        !isActive
                                          ? "bg-accent-pink neo-shadow-sm"
                                          : "bg-secondary hover:bg-accent-pink/40"
                                      }`}
                                    >
                                      Skip
                                    </button>
                                    {[25, 50, 75].map((pct) => (
                                      <button
                                        key={pct}
                                        onClick={() => setTokenByPercent(t.mint, pct)}
                                        className="neo-border rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-widest bg-secondary hover:bg-accent-lime/60 transition-all duration-150"
                                      >
                                        {pct}%
                                      </button>
                                    ))}
                                    <button
                                      onClick={() => setTokenByPercent(t.mint, 100)}
                                      className="neo-border rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-widest bg-accent-lime hover:neo-shadow-sm transition-all duration-150"
                                    >
                                      Max
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div>
                <span className="neo-badge bg-accent-lime mb-4 inline-block">Step 4</span>
                <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                  Review & <span className="bg-accent-lime px-2 inline-block rotate-[1deg]">confirm.</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="neo-card-static">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Timing
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-bold">Interval</span>
                      <span className="font-black text-xl">{formatDuration(heartbeatSeconds)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Grace</span>
                      <span className="font-black text-xl">{formatDuration(graceSeconds)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Pause</span>
                      <span className="font-black text-xl">{formatDuration(pauseSeconds)}</span>
                    </div>
                    <div className="flex justify-between border-t-4 border-foreground pt-2 mt-2">
                      <span className="font-bold">Total</span>
                      <span className="font-black text-xl">
                        {formatDuration(heartbeatSeconds + graceSeconds)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="neo-card-static">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Deposits
                  </h3>
                  {solAmount > 0 && (
                    <div className="flex justify-between mb-2">
                      <span className="font-bold">{SOL_LABEL}</span>
                      <span className="font-black text-xl">{solAmount.toFixed(Math.min(6, SOL_DECIMALS))}</span>
                    </div>
                  )}
                  {selectedTokenEntries.map(([mint, amt]) => {
                    const tok = (tokens ?? []).find((t) => t.mint === mint);
                    const tokLabel = tok?.label ?? mint.slice(0, 8);
                    // const dec = tok?.decimals ?? 9;
                    return (
                      <div key={mint} className="flex justify-between mb-2">
                        <span className="font-bold">{tokLabel}</span>
                        {/*<span className="font-black text-xl">{amt.toFixed(Math.min(6, dec))}</span>*/}
                        <span className="font-black text-xl">{formatUiAmount(amt)}</span>
                      </div>
                    );
                  })}
                  {selectedTokenEntries.length > 0 && (
                    <p className="text-xs text-muted-foreground font-medium mt-2 border-t-2 border-foreground/10 pt-2">
                      {selectedTokenEntries.length + (solAmount > 0 ? 1 : 0)} asset(s) total
                      {selectedTokenEntries.length > 0 && " — tokens require separate transactions"}
                    </p>
                  )}
                </div>
              </div>

              <div className="neo-card-static">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Heir
                </h3>
                <p className="font-black text-lg">{label}</p>
                <p className="text-xs font-mono text-muted-foreground break-all">{heirAddress}</p>
              </div>

              {delegate && (
                <div className="neo-card-static bg-accent-purple/10">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5" strokeWidth={2.5} />
                    <p className="font-bold">
                      Guardian: <span className="font-mono text-sm break-all">{delegate}</span>
                    </p>
                  </div>
                </div>
              )}

              {hbSigner && (
                <div className="neo-card-static bg-accent-pink/10">
                  <div className="flex items-center gap-3">
                    <Heart className="h-5 w-5" strokeWidth={2.5} />
                    <p className="font-bold">
                      Heartbeat Signer: <span className="font-mono text-sm break-all">{hbSigner}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-12 pt-8 border-t-4 border-foreground">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setStep(step - 1)}
            disabled={step === 0 || isSubmitting}
          >
            <ArrowLeft className="h-5 w-5" /> Back
          </Button>
          {step < 3 ? (
            <Button
              variant="lime"
              size="lg"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed() || isSubmitting}
            >
              Next <ArrowRight className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="lime"
              size="xl"
              onClick={handleSubmit}
              disabled={!isHeirValid || !hasAnyDeposit || isSubmitting}
              className="neo-glow-lime"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                  Creating…
                </>
              ) : (
                "Create Estate"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
    {isSubmitting && (
      <div
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-6"
      >
        <div className="neo-card-static text-center max-w-md w-full neo-slide-up">
          {submitState === "complete" ? (
            <>
              <div className="bg-accent-lime neo-border rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <CheckCircle className="h-10 w-10" strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-black mb-3">Estate Created!</h2>
              <p className="text-lg font-medium text-muted-foreground mb-4">
                Your heartbeat is live on-chain.
              </p>
            </>
          ) : (
            <>
              <div className="bg-accent-yellow neo-border rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin" strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-black mb-3">Creating Estate…</h2>
              <p className="text-lg font-medium text-muted-foreground mb-4">
                {submitProgress || "Confirm the transaction in your wallet"}
              </p>
            </>
          )}
          <div className="flex flex-wrap gap-2 justify-center items-center">
            {txId && (
              <a
                href={explorerTxUrl(txId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 neo-badge bg-background hover:bg-secondary transition-colors"
              >
                View on Explorer <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          {submitState === "complete" && (
            <div className="flex items-center justify-center gap-2 mt-5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
              Redirecting to dashboard…
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
};

export default CreateVaultPage;
