import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useVault } from "@/contexts/VaultContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SOL_DECIMALS, LABEL_MAX_LEN, SECONDS_PER_DAY } from "@/lib/constants";
import { getSolanaExplorerTxUrl } from "@/lib/utils";
import { useWalletSplTokens } from "@/hooks/useWalletSplTokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import WalletPill from "@/components/WalletPill";
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
} from "lucide-react";
import { errMsg } from "@/lib/utils";

const STEPS = ["Heartbeat", "Heir", "Deposit", "Review"];

type SubmitState = "idle" | "creating" | "complete" | "error";

const CreateVaultPage = () => {
  const { publicKey, isConnected } = useWallet();
  const { createEstateOnChain } = useVault();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0);

  const [heartbeatSeconds, setHeartbeatSeconds] = useState(90 * SECONDS_PER_DAY);
  const [graceSeconds, setGraceSeconds] = useState(30 * SECONDS_PER_DAY);
  const [pauseSeconds, setPauseSeconds] = useState(0);
  const isPauseDisable = pauseSeconds === 0;

  const [heirAddress, setHeirAddress] = useState("");
  const [label, setLabel] = useState("heir");
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
    if (step === 0) return heartbeatSeconds > 0 && graceSeconds > 0;
    if (step === 1) return isHeirValid;
    if (step === 2) return hasAnyDeposit;
    return true;
  };

  const handleSubmit = async () => {
    if (!isConnected) {
      // Just-in-time connect: prompt the wallet at the moment it's actually
      // needed (depositing & signing), not on app launch.
      setWalletDialogOpen(true);
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
        description: errMsg(err, "Something went wrong"),
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

      <div className="bg-secondary border-b-4 border-foreground" data-tour="create-vault-steps">
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
            <HeartbeatStep
              heartbeatSeconds={heartbeatSeconds}
              setHeartbeatSeconds={setHeartbeatSeconds}
              graceSeconds={graceSeconds}
              setGraceSeconds={setGraceSeconds}
              pauseSeconds={pauseSeconds}
              setPauseSeconds={setPauseSeconds}
            />
          )}

          {step === 1 && (
            <HeirStep
              heirAddress={heirAddress}
              setHeirAddress={setHeirAddress}
              label={label}
              setLabel={setLabel}
              delegate={delegate}
              setDelegate={setDelegate}
              hbSigner={hbSigner}
              setHbSigner={setHbSigner}
              isPauseDisable={isPauseDisable}
            />
          )}

          {step === 2 && (
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

          {step === 3 && (
            <ReviewStep
              heartbeatSeconds={heartbeatSeconds}
              graceSeconds={graceSeconds}
              pauseSeconds={pauseSeconds}
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
