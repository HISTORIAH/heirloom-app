import { useState, useMemo, useEffect, useRef } from "react";
import SubmitOverlay from "@/components/create-vault/SubmitOverlay";
import { useWallet } from "@/contexts/WalletContext";
import { useVault } from "@/contexts/VaultContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SOL_DECIMALS, LABEL_MAX_LEN, SECONDS_PER_DAY } from "@/lib/constants";
import { toRawTokenAmount, truncateAddress } from "@/lib/utils";
import { useWalletSplTokens } from "@/hooks/useWalletSplTokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import HeartbeatStep from "@/components/create-vault/HeartbeatStep";
import HeirStep from "@/components/create-vault/HeirStep";
import DepositStep from "@/components/create-vault/DepositStep";
import ReviewStep from "@/components/create-vault/ReviewStep";
import SummaryColumn from "@/components/create-vault/SummaryColumn";
import Stepper from "@/components/create-vault/Stepper";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  ChevronDown,
  Copy,
  Loader2,
  LogOut,
  Wallet,
} from "lucide-react";
import { errMsg } from "@/lib/utils";
import { useAnalytics } from "@/contexts/AnalyticsContext";

const STEPS = ["HEIRS", "ASSETS", "HEARTBEAT", "REVIEW"] as const;
const STEP_COLORS = [
  "hsl(var(--accent-pink))",
  "hsl(var(--accent-orange))",
  "hsl(var(--accent-cyan))",
  "hsl(var(--accent-lime))",
];

type StepIndex = 0 | 1 | 2 | 3;
type SubmitState = "idle" | "creating" | "complete" | "error";

export interface TokenSelection {
  mint: string;
  amount: number; // UI amount (raw / 10^decimals)
  pct: number; // 25, 50, 75, 100
}

const CreateVaultPage = () => {
  const { publicKey, isConnected, disconnectWallet } = useWallet();
  const { createEstateOnChain } = useVault();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { track } = useAnalytics();

  const [step, setStep] = useState<StepIndex>(0);

  const [heartbeatSeconds, setHeartbeatSeconds] = useState(90 * SECONDS_PER_DAY);
  const [graceSeconds, setGraceSeconds] = useState(30 * SECONDS_PER_DAY);
  const [pauseSeconds] = useState(0);

  const [heirAddress, setHeirAddress] = useState("");
  const [label, setLabel] = useState("spouse");
  const [delegate, setDelegate] = useState("");
  const [hbSigner, setHbSigner] = useState("");

  const { data: tokens, isLoading: tokensLoading } = useWalletSplTokens(isConnected ? publicKey : null);
  const { sol: solBalance, loading: solLoading } = useTokenBalances(isConnected ? publicKey : null);

  const [solAmount, setSolAmount] = useState<number>(0);
  // Token selections: map mint -> { amount, pct }
  const [tokenSelections, setTokenSelections] = useState<Record<string, TokenSelection>>({});

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [submitProgress, setSubmitProgress] = useState<string>("");
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedTokenEntries = useMemo(
    () => Object.entries(tokenSelections).filter(([, v]) => v.amount > 0),
    [tokenSelections]
  );
  const hasAnyDeposit = solAmount > 0 || selectedTokenEntries.length > 0;

  const isHeirValid = heirAddress.trim().length >= 32 && label.trim().length > 0 && label.length <= LABEL_MAX_LEN;

  const canProceed = () => {
    if (step === 0) return isHeirValid;
    if (step === 1) return true; // empty estate allowed
    if (step === 2) return heartbeatSeconds > 0 && graceSeconds > 0;
    return acknowledged;
  };

  // Close wallet dropdown on click outside
  const walletDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!walletDropdownOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!walletDropdownRef.current?.contains(e.target as Node)) {
        setWalletDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [walletDropdownOpen]);

  const handleSubmit = async () => {
    if (!isConnected) {
      setWalletDialogOpen(true);
      return;
    }
    try {
      track("vault_creation_started", {
        has_delegate: Boolean(delegate.trim()),
        has_heartbeat_signer: Boolean(hbSigner.trim()),
        token_count: selectedTokenEntries.length,
      });
      setSubmitState("creating");
      const lamports = toRawTokenAmount(String(solAmount), SOL_DECIMALS);

      const tokenDeposits = selectedTokenEntries.map(([mint, sel]) => {
        const tok = (tokens ?? []).find((t) => t.mint === mint);
        const decimals = tok?.decimals ?? 9;
        return {
          mint,
          amount: toRawTokenAmount(sel.amount, decimals),
          decimals,
          tokenProgram: tok?.tokenProgram,
        };
      });

      setSubmitProgress(
        tokenDeposits.length > 0
          ? `Creating estate + registering ${tokenDeposits.length} token(s)...`
          : "Creating estate..."
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
      track("vault_created", {
        has_delegate: Boolean(delegate.trim()),
        has_heartbeat_signer: Boolean(hbSigner.trim()),
        token_count: tokenDeposits.length,
      });
      toast({ title: "Estate Created!", description: "Your heartbeat estate is live on-chain." });
    } catch (err: unknown) {
      setSubmitState("error");
      track("vault_creation_failed", { stage: "transaction" });
      toast({
        title: "Transaction Failed",
        description: errMsg(err, "Something went wrong"),
        variant: "destructive",
      });
    }
  };

  const isSubmitting = submitState === "creating" || submitState === "complete";
  const accentColor = STEP_COLORS[step];
  const totalDays = Math.round(heartbeatSeconds / SECONDS_PER_DAY) + Math.round(graceSeconds / SECONDS_PER_DAY);
  const intervalDays = Math.round(heartbeatSeconds / SECONDS_PER_DAY);
  const graceDays = Math.round(graceSeconds / SECONDS_PER_DAY);

  // Success state
  if (submitState === "complete") {
    return (
      <>
        <div className="bg-background min-h-screen">
          {/* Header */}
          <div className="border-b-4 border-foreground bg-background sticky top-0 z-50">
            <div className="max-w-[1180px] mx-auto px-6 flex items-center justify-between h-20">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-lg font-bold hover:underline group"
              >
                <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" strokeWidth={2.5} />
                Home
              </button>
              <span className="text-2xl font-bold font-display">Create Estate</span>
              {isConnected ? (
                <button
                  onClick={() => void disconnectWallet()}
                  className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:underline"
                >
                  <LogOut className="h-4 w-4" strokeWidth={2.5} />
                  <span className="hidden sm:inline">Disconnect</span>
                </button>
              ) : (
                <button
                  onClick={() => setWalletDialogOpen(true)}
                  className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:underline"
                >
                  <Wallet className="h-4 w-4" strokeWidth={2.5} />
                  <span className="hidden sm:inline">Connect Wallet</span>
                </button>
              )}
            </div>
          </div>

          <main className="max-w-[1180px] mx-auto px-6 py-12">
            <Stepper steps={STEPS} currentStep={4} completedSteps={4} onStepClick={() => {}} accentColor="#A3E635" />

            <div className="mt-8">
              <div className="bg-card border-4 border-foreground rounded-[20px] p-12 text-center neo-shadow-lime neo-slide-up">
                <div className="w-24 h-24 rounded-full bg-accent-lime border-4 border-foreground mx-auto mb-8 flex items-center justify-center neo-shadow-md">
                  <CheckCircle className="h-12 w-12" strokeWidth={2.5} />
                </div>
                <h2 className="text-4xl font-display mb-4">Estate created.</h2>
                <p className="text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">
                  <strong>{label || "Your heir"}</strong> ({truncateAddress(heirAddress)}) inherits everything if you go quiet for{" "}
                  <strong>{totalDays} days</strong>. First check-in due{" "}
                  <strong>
                    {new Date(Date.now() + intervalDays * 864e5).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </strong>
                  .
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="inline-flex items-center gap-2 h-12 px-8 rounded-xl font-bold uppercase tracking-wide border-4 border-foreground bg-accent-lime text-foreground transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_hsl(var(--foreground))]"
                  >
                    GO TO DASHBOARD
                  </button>
                  <button
                    onClick={() => {
                      // Reset all state
                      setStep(0);
                      setHeirAddress("");
                      setLabel("spouse");
                      setDelegate("");
                      setHbSigner("");
                      setSolAmount(0);
                      setTokenSelections({});
                      setHeartbeatSeconds(90 * SECONDS_PER_DAY);
                      setGraceSeconds(30 * SECONDS_PER_DAY);
                      setAcknowledged(false);
                      setSubmitState("idle");
                      setTxId(null);
                    }}
                    className="inline-flex items-center gap-2 h-12 px-8 rounded-xl font-bold uppercase tracking-wide border-4 border-foreground bg-background text-muted-foreground transition-all duration-150 hover:bg-secondary"
                  >
                    CREATE ANOTHER
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
        <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
      </>
    );
  }

  return (
    <>
      <div className="bg-background min-h-screen" aria-hidden={isSubmitting} style={isSubmitting ? { pointerEvents: "none" } : undefined}>
        {/* Header */}
        <div className="border-b-4 border-foreground bg-background sticky top-0 z-50">
          <div className="max-w-[1180px] mx-auto px-6 flex items-center justify-between h-20">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-lg font-bold hover:underline group"
            >
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" strokeWidth={2.5} />
              Home
            </button>
            <span className="text-2xl font-bold font-display">Create Estate</span>
            {isConnected ? (
              <div className="relative" ref={walletDropdownRef}>
                <button
                  onClick={() => setWalletDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 border-[3px] border-foreground rounded-lg px-3 py-2 bg-accent-lime font-bold text-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] shadow-[2px_2px_0px_0px_hsl(var(--foreground))] hover:shadow-[4px_4px_0px_0px_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      walletDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {walletDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 border-4 border-foreground rounded-xl bg-background p-3 space-y-2 shadow-[6px_6px_0px_0px_hsl(var(--foreground))] z-50">
                    <button
                      onClick={async () => {
                        if (!publicKey) return;
                        try {
                          await navigator.clipboard.writeText(publicKey);
                          setCopied(true);
                          setTimeout(() => {
                            setCopied(false);
                            setWalletDropdownOpen(false);
                          }, 1200);
                        } catch {
                          setCopied(false);
                        }
                      }}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold hover:bg-secondary transition-colors text-left"
                    >
                      {copied ? (
                        <><Check className="h-4 w-4" /> Copied</>
                      ) : (
                        <><Copy className="h-4 w-4" /> Copy address</>
                      )}
                    </button>
                    <div className="border-t-2 border-foreground" />
                    <button
                      onClick={() => {
                        setWalletDropdownOpen(false);
                        void disconnectWallet();
                      }}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4" /> Disconnect wallet
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setWalletDialogOpen(true)}
                className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:underline"
              >
                <Wallet className="h-4 w-4" strokeWidth={2.5} />
                <span className="hidden sm:inline">Connect Wallet</span>
              </button>
            )}
          </div>
        </div>

        <main className="max-w-[1180px] mx-auto px-6 pt-12 pb-24">
          {/* Stepper */}
          <Stepper
            steps={STEPS}
            currentStep={step}
            completedSteps={step}
            onStepClick={(idx) => {
              if (idx < step) setStep(idx as StepIndex);
            }}
            accentColor={accentColor}
          />

          {/* Main card */}
          <div
            className="mt-12 bg-card border-4 border-foreground rounded-[20px] overflow-hidden neo-slide-up"
            style={{ boxShadow: `10px 10px 0 0 ${accentColor}` }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr]">
              {/* Form column */}
              <div className="p-8 lg:p-10">
                {step === 0 && (
                  <HeirStep
                    heirAddress={heirAddress}
                    setHeirAddress={setHeirAddress}
                    label={label}
                    setLabel={setLabel}
                    delegate={delegate}
                    setDelegate={setDelegate}
                    hbSigner={hbSigner}
                    setHbSigner={setHbSigner}
                  />
                )}

                {step === 1 && (
                  <DepositStep
                    solAmount={solAmount}
                    setSolAmount={setSolAmount}
                    tokenSelections={tokenSelections}
                    setTokenSelections={setTokenSelections}
                    tokens={tokens}
                    tokensLoading={tokensLoading}
                    solBalance={solBalance}
                    solLoading={solLoading}
                    isConnected={isConnected}
                  />
                )}

                {step === 2 && (
                  <HeartbeatStep
                    heartbeatSeconds={heartbeatSeconds}
                    setHeartbeatSeconds={setHeartbeatSeconds}
                    graceSeconds={graceSeconds}
                    setGraceSeconds={setGraceSeconds}
                    assetCount={hasAnyDeposit ? selectedTokenEntries.length + (solAmount > 0 ? 1 : 0) : 0}
                  />
                )}

                {step === 3 && (
                  <ReviewStep
                    heartbeatSeconds={heartbeatSeconds}
                    graceSeconds={graceSeconds}
                    heirAddress={heirAddress}
                    label={label}
                    delegate={delegate}
                    hbSigner={hbSigner}
                    solAmount={solAmount}
                    tokenSelections={tokenSelections}
                    tokens={tokens}
                    acknowledged={acknowledged}
                    setAcknowledged={setAcknowledged}
                    onEdit={(targetStep) => setStep(targetStep as StepIndex)}
                  />
                )}
              </div>

              {/* Summary column */}
              <div className="border-t-4 lg:border-t-0 lg:border-l-4 border-foreground p-8 lg:p-10 bg-[#FDFDFB]">
                <SummaryColumn
                  step={step}
                  label={label}
                  heirAddress={heirAddress}
                  solAmount={solAmount}
                  tokenSelections={tokenSelections}
                  tokens={tokens}
                  intervalDays={intervalDays}
                  graceDays={graceDays}
                  totalDays={totalDays}
                  delegate={delegate}
                  hbSigner={hbSigner}
                  onTokenPctChange={(mint, pct) => {
                    setTokenSelections((prev) => {
                      const existing = prev[mint];
                      if (!existing) return prev;
                      const tok = (tokens ?? []).find((t) => t.mint === mint);
                      if (!tok) return prev;
                      const newAmount = (tok.uiAmount * pct) / 100;
                      return { ...prev, [mint]: { ...existing, amount: newAmount, pct } };
                    });
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-8 lg:px-10 py-5 border-t-4 border-foreground">
              <button
                onClick={() => setStep((s) => (s > 0 ? (s - 1) as StepIndex : s))}
                disabled={step === 0 || isSubmitting}
                className="inline-flex items-center gap-2 h-11 px-6 rounded-xl font-bold uppercase tracking-wide border-4 border-foreground bg-background text-muted-foreground transition-all duration-150 hover:bg-secondary disabled:pointer-events-none disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> BACK
              </button>

              {step < 3 ? (
                <button
                  onClick={() => setStep((s) => (s + 1) as StepIndex)}
                  disabled={!canProceed() || isSubmitting}
                  className={`inline-flex items-center gap-2 h-11 px-7 rounded-xl font-bold uppercase tracking-wide border-4 border-foreground transition-all duration-150 disabled:pointer-events-none disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:border-4 disabled:border-foreground ${
                    step === 1 && !hasAnyDeposit
                      ? "bg-background text-muted-foreground shadow-[4px_4px_0_0_hsl(var(--muted-foreground))]"
                      : "bg-accent-lime text-foreground shadow-[5px_5px_0_0_hsl(var(--foreground))] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_hsl(var(--foreground))] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                  }`}
                >
                  {step === 1 && !hasAnyDeposit ? "SKIP FOR NOW →" : "NEXT →"}
                  {step !== 1 && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceed() || isSubmitting}
                  className="inline-flex items-center gap-2 h-11 px-8 rounded-xl font-bold uppercase tracking-wide border-4 border-foreground bg-accent-lime text-foreground shadow-[5px_5px_0_0_hsl(var(--foreground))] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_hsl(var(--foreground))] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_hsl(var(--foreground))] disabled:pointer-events-none disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:border-4 disabled:border-foreground"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                      Creating…
                    </>
                  ) : (
                    "CREATE ESTATE"
                  )}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Submit overlay */}
      {submitState !== "idle" && submitState !== "error" && (
        <SubmitOverlay
          submitState={submitState}
          submitProgress={submitProgress}
          txId={txId}
        />
      )}
      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

export default CreateVaultPage;
