import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useVault } from "@/contexts/VaultContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SOL_DECIMALS, LABEL_MAX_LEN, SECONDS_PER_DAY } from "@/lib/constants";
import { getSolanaExplorerTxUrl, toRawTokenAmount } from "@/lib/utils";
import { useWalletSplTokens } from "@/hooks/useWalletSplTokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import HeartbeatStep from "@/components/create-vault/HeartbeatStep";
import HeirStep from "@/components/create-vault/HeirStep";
import DepositStep from "@/components/create-vault/DepositStep";
import ReviewStep from "@/components/create-vault/ReviewStep";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  ExternalLink,
  LogOut,
  Wallet,
} from "lucide-react";
import { errMsg } from "@/lib/utils";
import { useAnalytics } from "@/contexts/AnalyticsContext";

const STEPS = ["Heir", "Deposit", "Heartbeat", "Review"];

const STEP_COLORS = [
  "hsl(var(--accent-pink))",
  "hsl(var(--accent-orange))",
  "hsl(var(--accent-cyan))",
  "hsl(var(--accent-lime))",
];

type SubmitState = "idle" | "creating" | "complete" | "error";

const CreateVaultPage = () => {
  const { publicKey, isConnected, disconnectWallet } = useWallet();
  const { createEstateOnChain } = useVault();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { track } = useAnalytics();

  const [step, setStep] = useState(0);

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
  const [tokenAmounts, setTokenAmounts] = useState<Record<string, number>>({});

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [submitProgress, setSubmitProgress] = useState<string>("");
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);

  const selectedTokenEntries = Object.entries(tokenAmounts).filter(([, v]) => v > 0);
  const hasAnyDeposit = solAmount > 0 || selectedTokenEntries.length > 0;

  const isHeirValid = heirAddress.trim().length > 0 && label.trim().length > 0 && label.length <= LABEL_MAX_LEN;
  const canProceed = () => {
    if (step === 0) return isHeirValid;
    if (step === 1) return hasAnyDeposit;
    if (step === 2) return heartbeatSeconds > 0 && graceSeconds > 0;
    return true;
  };

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
      const lamports = toRawTokenAmount(solAmount, SOL_DECIMALS);

      const tokenDeposits = selectedTokenEntries.map(([mint, amt]) => {
        const tok = (tokens ?? []).find((t) => t.mint === mint);
        const decimals = tok?.decimals ?? 9;
        return {
          mint,
          amount: toRawTokenAmount(amt, decimals),
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
      track("vault_created", {
        has_delegate: Boolean(delegate.trim()),
        has_heartbeat_signer: Boolean(hbSigner.trim()),
        token_count: tokenDeposits.length,
      });
      toast({ title: "Estate Created!", description: "Your heartbeat vault is live on-chain." });
      setTimeout(() => navigate("/dashboard"), 3000);
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

  return (
    <>
      <div
        className="bg-background"
        aria-hidden={isSubmitting}
        style={isSubmitting ? { pointerEvents: "none" } : undefined}
      >
        {/* Header */}
        <div className="border-b-4 border-foreground bg-background sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-20">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-lg font-bold hover:underline group"
            >
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" strokeWidth={2.5} />
              Home
            </button>
            <span className="text-2xl font-bold">Create Estate</span>
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

        {/* Stepper — centered above content, no labels, no gray bar */}
        <div className="max-w-4xl mx-auto px-6 pt-6 pb-4" data-tour="create-vault-steps">
          <div className="flex items-center justify-center">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                {/* Step dot */}
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-base transition-all duration-300 border-4 border-foreground ${
                    i < step
                      ? ""
                      : i === step
                        ? "scale-110"
                        : ""
                  }`}
                  style={
                    i === step
                      ? {
                          backgroundColor: STEP_COLORS[i],
                          boxShadow: "4px 4px 0 0 hsl(var(--foreground))",
                        }
                      : i < step
                        ? { backgroundColor: "hsl(var(--accent-lime))" }
                        : { backgroundColor: "white" }
                  }
                >
                  {i < step ? (
                    <CheckCircle className="h-5 w-5" strokeWidth={2.5} />
                  ) : (
                    i + 1
                  )}
                </div>
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div
                    className="w-16 md:w-32 h-1 mx-1 md:mx-2"
                    style={{
                      backgroundColor:
                        i < step
                          ? "hsl(var(--accent-lime))"
                          : "hsl(var(--foreground))",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="neo-slide-up" key={step}>
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
                tokenAmounts={tokenAmounts}
                setTokenAmounts={setTokenAmounts}
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
                tokenAmounts={tokenAmounts}
                tokens={tokens}
              />
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t-4 border-foreground">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 0 || isSubmitting}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg font-bold uppercase tracking-wide border-4 border-foreground bg-background text-muted-foreground transition-all duration-150 hover:bg-secondary disabled:pointer-events-none disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Back
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed() || isSubmitting}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg font-bold uppercase tracking-wide border-4 border-foreground bg-accent-lime text-foreground transition-all duration-150 hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
              >
                Next <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!isHeirValid || !hasAnyDeposit || isSubmitting}
                className="inline-flex items-center gap-2 h-10 px-6 rounded-lg font-bold uppercase tracking-wide border-4 border-foreground bg-accent-lime text-foreground text-sm transition-all duration-150 hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                    Creating…
                  </>
                ) : (
                  "Create Estate"
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Submit overlay */}
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
                <h2 className="text-3xl font-bold mb-3">Estate Created!</h2>
                <p className="text-lg font-medium text-muted-foreground mb-4">
                  Your heartbeat is live on-chain.
                </p>
              </>
            ) : (
              <>
                <div className="bg-accent-yellow neo-border rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin" strokeWidth={2.5} />
                </div>
                <h2 className="text-3xl font-bold mb-3">Creating Estate…</h2>
                <p className="text-lg font-medium text-muted-foreground mb-4">
                  {submitProgress || "Confirm the transaction in your wallet"}
                </p>
              </>
            )}
            <div className="flex flex-wrap gap-2 justify-center items-center">
              {txId && (
                <a
                  href={getSolanaExplorerTxUrl(txId)}
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
      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

export default CreateVaultPage;
