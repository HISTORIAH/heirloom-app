import AppFrame, { PageHead } from "@/components/app/AppFrame";
import { Panel } from "@/components/app/Panel";
import { useState, useMemo, useEffect } from "react";
import SubmitOverlay from "@/components/create-vault/SubmitOverlay";
import { useWallet } from "@/contexts/WalletContext";
import { useVault } from "@/contexts/VaultContext";
import { useTour } from "@/contexts/TourContext";
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
import { ArrowLeft, ArrowRight, Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errMsg } from "@/lib/utils";
import { FEATURE_NOTIFICATIONS_UI } from "@/config";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import Stepper from "@/components/create-vault/Stepper";
import SummaryColumn from "@/components/create-vault/SummaryColumn";
import { useTranslation } from "@heirloom/i18n";

const STEPS = ["HEIRS", "ASSETS", "HEARTBEAT", "REVIEW"] as const;

type StepIndex = 0 | 1 | 2 | 3;
type SubmitState = "idle" | "creating" | "complete" | "error";

export interface TokenSelection {
  mint: string;
  amount: number; // UI amount (raw / 10^decimals)
  pct: number; // 25, 50, 75, 100
}

const CreateVaultPage = () => {
  const { publicKey, isConnected } = useWallet();
  const { createEstateOnChain } = useVault();
  const { vaultStep } = useTour();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { t, i18n } = useTranslation("app");

  const [step, setStep] = useState<StepIndex>(0);

  // When the onboarding tour highlights a specific wizard step, follow along.
  useEffect(() => {
    if (vaultStep != null && vaultStep >= 0 && vaultStep <= STEPS.length - 1) {
      setStep(vaultStep as StepIndex);
    }
  }, [vaultStep]);

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

  const selectedTokenEntries = useMemo(
    () => Object.entries(tokenSelections).filter(([, v]) => v.amount > 0),
    [tokenSelections],
  );
  const hasAnyDeposit = solAmount > 0 || selectedTokenEntries.length > 0;

  const isHeirValid = heirAddress.trim().length >= 32 && label.trim().length > 0 && label.length <= LABEL_MAX_LEN;

  const canProceed = () => {
    if (step === 0) return isHeirValid;
    if (step === 1) return true; // empty estate allowed
    if (step === 2) return heartbeatSeconds > 0 && graceSeconds > 0;
    return acknowledged;
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
          ? t("createVault.progressTokens", { count: tokenDeposits.length })
          : t("createVault.progressEstate")
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
      toast({ title: t("createVault.toastCreatedTitle"), description: t("createVault.toastCreatedDesc") });
    } catch (err: unknown) {
      setSubmitState("error");
      track("vault_creation_failed", { stage: "transaction" });
      toast({
        title: t("createVault.toastFailedTitle"),
        description: errMsg(err, t("createVault.toastFailedDesc")),
        variant: "destructive",
      });
    }
  };

  const isSubmitting = submitState === "creating" || submitState === "complete";
  const steps = [t("createVault.stepHeirs"), t("createVault.stepAssets"), t("createVault.stepHeartbeat"), t("createVault.stepReview")];
  const totalDays = Math.round(heartbeatSeconds / SECONDS_PER_DAY) + Math.round(graceSeconds / SECONDS_PER_DAY);
  const intervalDays = Math.round(heartbeatSeconds / SECONDS_PER_DAY);
  const graceDays = Math.round(graceSeconds / SECONDS_PER_DAY);

  // Success state
  if (submitState === "complete") {
    return (
      <>
        <AppFrame
          head={
            <PageHead
              label={t("createVault.title")}
              backTo="/dashboard"
              backLabel={t("nav.dashboard")}
            />
          }
        >
          <div className="mx-auto max-w-3xl">
            <Stepper steps={steps} currentStep={4} completedSteps={4} onStepClick={() => {}} />

            {/* The estate exists. The page says so once, in the largest type on
                the screen, and then tells you exactly what happens next. */}
            <div className="rise-in mt-12 text-center">
              {/* Lime, because the vault is now doing the one thing lime means. */}
              <span className="tag tag-live">
                <Check className="h-3 w-3" strokeWidth={2.5} /> {t("dashboard.statusActive")}
              </span>
              <h2 className="ed-h2 mt-6">{t("createVault.successTitle")}</h2>
              <p className="ed-body mx-auto mt-5 max-w-[52ch] text-muted-foreground">
                <strong className="font-semibold text-foreground">{label || t("createVault.yourHeir")}</strong>{" "}
                ({truncateAddress(heirAddress)}) {t("createVault.successBody1")}{" "}
                <strong className="font-semibold text-foreground">
                  {totalDays} {t("createVault.successBody2")}
                </strong>
                . {t("createVault.successBody3")}{" "}
                <strong className="font-semibold text-foreground">
                  {new Date(Date.now() + intervalDays * 864e5).toLocaleDateString(i18n.language, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
                .
              </p>

              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Button variant="flat" size="lg" onClick={() => navigate("/dashboard")}>
                  {t("createVault.goToDashboard")}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
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
                >
                  {t("createVault.createAnother")}
                </Button>
              </div>

              {FEATURE_NOTIFICATIONS_UI && (
                <div className="mx-auto mt-10 flex w-fit items-center gap-2 border-t border-tile-line pt-5 text-sm font-medium text-muted-foreground">
                  <Bell className="h-4 w-4" strokeWidth={2} />
                  {t("createVault.remindersNote")}
                </div>
              )}
            </div>
          </div>
        </AppFrame>
        <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
      </>
    );
  }

  return (
    <>
      <div aria-hidden={isSubmitting} style={isSubmitting ? { pointerEvents: "none" } : undefined}>
        <AppFrame
          head={
            <PageHead
              label={t("createVault.title")}
              meta={steps[step]}
              backTo="/dashboard"
              backLabel={t("nav.dashboard")}
            />
          }
        >
          <div>
            <Stepper
              steps={steps}
              currentStep={step}
              completedSteps={step}
              onStepClick={(idx) => {
                if (idx < step) setStep(idx as StepIndex);
              }}
            />

            {/* One panel, split: what you are deciding on the left, what the
                estate looks like so far on the right. The divider is the same
                hairline the rest of the page is ruled with. */}
            <Panel pad={false} className="rise-in mt-10 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr]">
                <div className="p-6 md:p-8 lg:p-10">
                  {step === 0 && (
                    <div data-tour="create-vault-heirs">
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
                    </div>
                  )}

                  {step === 1 && (
                    <div data-tour="create-vault-assets">
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
                    </div>
                  )}

                  {step === 2 && (
                    <div data-tour="create-vault-heartbeat">
                      <HeartbeatStep
                        heartbeatSeconds={heartbeatSeconds}
                        setHeartbeatSeconds={setHeartbeatSeconds}
                        graceSeconds={graceSeconds}
                        setGraceSeconds={setGraceSeconds}
                        assetCount={
                          hasAnyDeposit ? selectedTokenEntries.length + (solAmount > 0 ? 1 : 0) : 0
                        }
                      />
                    </div>
                  )}

                  {step === 3 && (
                    <div data-tour="create-vault-review">
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
                    </div>
                  )}
                </div>

                <div className="border-t border-tile-line bg-tile-soft p-6 md:p-8 lg:border-l lg:border-t-0 lg:p-10">
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
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-tile-line px-6 py-4 md:px-8 lg:px-10">
                <Button
                  variant="ghost"
                  onClick={() => setStep((s) => (s > 0 ? ((s - 1) as StepIndex) : s))}
                  disabled={step === 0 || isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2} /> {t("createVault.back")}
                </Button>

                {step < 3 ? (
                  <Button
                    variant="yellow"
                    onClick={() => setStep((s) => (s + 1) as StepIndex)}
                    disabled={!canProceed() || isSubmitting}
                  >
                    {step === 1 && !hasAnyDeposit ? t("createVault.skipForNow") : t("createVault.next")}
                    {step !== 1 && <ArrowRight className="h-4 w-4" strokeWidth={2} />}
                  </Button>
                ) : (
                  <Button
                    variant="yellow"
                    onClick={handleSubmit}
                    disabled={!canProceed() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                        {t("createVault.creating")}
                      </>
                    ) : (
                      t("createVault.createEstate")
                    )}
                  </Button>
                )}
              </div>
            </Panel>
          </div>
        </AppFrame>
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
