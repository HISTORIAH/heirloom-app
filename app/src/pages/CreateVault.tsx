import React, { useState } from "react";
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
  Plus,
  X,
} from "lucide-react";

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

type Accent = "orange" | "cyan" | "lime" | "pink" | "yellow";

const ACCENT_BG: Record<Accent, string> = {
  orange: "bg-accent-orange",
  cyan: "bg-accent-cyan",
  lime: "bg-accent-lime",
  pink: "bg-accent-pink",
  yellow: "bg-accent-yellow",
};

interface AssetCardProps {
  cardKey: string;
  title: string;
  subtitle: string;
  accent: Accent;
  icon: React.ReactNode;
  decimals: number;
  presets: number[];
  presetLabel: (value: number) => string;
  selected: boolean;
  amount: number;
  onSelect: (value: number) => void;
  onSkip: () => void;
  maxAmount?: number;
}

const AssetCard: React.FC<AssetCardProps> = ({
  title,
  subtitle,
  accent,
  icon,
  decimals,
  presets,
  presetLabel,
  selected,
  amount,
  onSelect,
  onSkip,
  maxAmount,
}) => {
  const accentBg = ACCENT_BG[accent];
  const isSkip = !selected || amount <= 0;
  return (
    <div className="neo-card-static">
      <div className="flex items-center gap-3 mb-4">
        <div className={`${accentBg} neo-border rounded-xl p-3`}>{icon}</div>
        <div>
          <h3 className="text-xl font-black">{title}</h3>
          <p className="text-xs font-bold text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <input
        type="number"
        min={0}
        max={maxAmount}
        step={1 / Math.pow(10, Math.min(6, decimals))}
        value={selected ? amount : 0}
        onChange={(e) => {
          const v = Math.max(0, Number(e.target.value));
          if (v === 0) onSkip();
          else onSelect(v);
        }}
        className="neo-input font-black text-3xl text-center !py-4"
      />
      <div className="flex gap-2 flex-wrap mt-4">
        <button
          onClick={onSkip}
          className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 ${
            isSkip ? `${accentBg} neo-shadow-sm` : "bg-secondary"
          }`}
        >
          Skip
        </button>
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 ${
              selected && amount === p ? `${accentBg} neo-shadow-sm` : "bg-secondary"
            }`}
          >
            {presetLabel(p)}
          </button>
        ))}
      </div>
    </div>
  );
};

const SOL_KEY = "sol";

const SOL_PRESETS = [0.01, 0.1, 0.5, 1, 5];

function presetsForDecimals(decimals: number): number[] {
  if (decimals >= 8) return [0.001, 0.01, 0.05, 0.1];
  if (decimals >= 6) return [10, 100, 500, 1000];
  return [1, 10, 100, 1000];
}

function formatPreset(value: number, symbol: string): string {
  if (symbol === "USDC" || symbol === "USDCx") return `$${value}`;
  return `${value} ${symbol}`;
}

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

  const { tokens, loading: tokensLoading } = useWalletSplTokens(isConnected ? publicKey : null);

  // Multi-asset state: SOL amount + per-token amounts
  const [solAmount, setSolAmount] = useState<number>(0.1);
  const [tokenAmounts, setTokenAmounts] = useState<Record<string, number>>({});

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
        const tok = tokens.find((t) => t.mint === mint);
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

  if (submitState !== "idle" && submitState !== "error") {
    return (
      <div className="min-h-screen bg-accent-lime flex items-center justify-center p-6">
        <div className="neo-card-static text-center max-w-md w-full neo-slide-up">
          {submitState === "complete" ? (
            <>
              <div className="bg-accent-lime neo-border rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <CheckCircle className="h-10 w-10" strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-black mb-3">Estate Created!</h2>
              <p className="text-lg font-medium text-muted-foreground mb-4">
                Your heartbeat is live. Redirecting to dashboard...
              </p>
            </>
          ) : (
            <>
              <div className="bg-accent-yellow neo-border rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin" strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-black mb-3">Creating Estate...</h2>
              <p className="text-lg font-medium text-muted-foreground mb-4">
                {submitProgress || "Confirm the transaction in your wallet"}
              </p>
            </>
          )}
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : ""}
          </div>
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

              {tokensLoading && (
                <div className="neo-card-static flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                  <span className="font-bold">Scanning wallet for SPL tokens…</span>
                </div>
              )}

              {/* SOL deposit — always shown */}
              <AssetCard
                cardKey={SOL_KEY}
                title={SOL_LABEL}
                subtitle={`Amount in SOL (${SOL_DECIMALS} decimals)`}
                accent="orange"
                icon={<Coins className="h-6 w-6" strokeWidth={2.5} />}
                decimals={SOL_DECIMALS}
                presets={SOL_PRESETS}
                presetLabel={(v) => formatPreset(v, SOL_LABEL)}
                selected={solAmount > 0}
                amount={solAmount}
                onSelect={(v) => setSolAmount(v)}
                onSkip={() => setSolAmount(0)}
              />

              {/* Token deposits — each independently togglable */}
              {tokens.length > 0 && (
                <div>
                  <h3 className="text-lg font-black mb-3">SPL Tokens (optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tokens.map((t) => {
                      const isActive = (tokenAmounts[t.mint] ?? 0) > 0;
                      return (
                        <div key={t.mint} className="relative">
                          {isActive && (
                            <button
                              onClick={() => removeToken(t.mint)}
                              className="absolute top-3 right-3 z-10 neo-border rounded-full p-1 bg-accent-red/20 hover:bg-accent-red/40 transition-colors"
                            >
                              <X className="h-4 w-4" strokeWidth={3} />
                            </button>
                          )}
                          <AssetCard
                            cardKey={t.mint}
                            title={t.label}
                            subtitle={`Bal ${t.uiAmount.toLocaleString(undefined, { maximumFractionDigits: Math.min(6, t.decimals) })}`}
                            accent={t.label === "USDC" ? "cyan" : "lime"}
                            icon={<Coins className="h-6 w-6" strokeWidth={2.5} />}
                            decimals={t.decimals}
                            presets={presetsForDecimals(t.decimals)}
                            presetLabel={(v) => formatPreset(v, t.label)}
                            selected={isActive}
                            amount={tokenAmounts[t.mint] ?? 0}
                            onSelect={(v) => setTokenAmount(t.mint, v)}
                            onSkip={() => removeToken(t.mint)}
                            maxAmount={t.uiAmount}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!tokensLoading && tokens.length === 0 && (
                <p className="text-sm font-medium text-muted-foreground">
                  No SPL tokens with balance found in your wallet. Funding with {SOL_LABEL}.
                </p>
              )}

              {selectedTokenEntries.length > 0 && (
                <div className="neo-card-static bg-accent-lime/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Plus className="h-4 w-4" strokeWidth={3} />
                    <span className="text-sm font-black uppercase tracking-widest">
                      {selectedTokenEntries.length} token{selectedTokenEntries.length !== 1 ? "s" : ""} selected
                    </span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Each token requires a separate on-chain transaction after estate creation.
                  </p>
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
                    const tok = tokens.find((t) => t.mint === mint);
                    const tokLabel = tok?.label ?? mint.slice(0, 8);
                    const dec = tok?.decimals ?? 9;
                    return (
                      <div key={mint} className="flex justify-between mb-2">
                        <span className="font-bold">{tokLabel}</span>
                        <span className="font-black text-xl">{amt.toFixed(Math.min(6, dec))}</span>
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
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-12 pt-8 border-t-4 border-foreground">
          <Button variant="outline" size="lg" onClick={() => setStep(step - 1)} disabled={step === 0}>
            <ArrowLeft className="h-5 w-5" /> Back
          </Button>
          {step < 3 ? (
            <Button variant="lime" size="lg" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next <ArrowRight className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="lime"
              size="xl"
              onClick={handleSubmit}
              disabled={!isHeirValid || !hasAnyDeposit}
              className="neo-glow-lime"
            >
              Create Estate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateVaultPage;
