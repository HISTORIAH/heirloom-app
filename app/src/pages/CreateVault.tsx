import PageHeader from "@/components/PageHeader";
import { useState, useMemo, useEffect } from "react";
import SubmitOverlay from "@/components/create-vault/SubmitOverlay";
import { useWallet } from "@/contexts/WalletContext";
import { useVault } from "@/contexts/VaultContext";
import { useTour } from "@/contexts/TourContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SOL_DECIMALS, LABEL_MAX_LEN, SECONDS_PER_DAY } from "@/lib/constants";
import { errMsg, isValidSolanaAddress, toRawTokenAmount } from "@/lib/utils";
import { useWalletSplTokens } from "@/hooks/useWalletSplTokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import HeartbeatStep from "@/components/create-vault/HeartbeatStep";
import HeirStep from "@/components/create-vault/HeirStep";
import DepositStep from "@/components/create-vault/DepositStep";
import ReviewStep from "@/components/create-vault/ReviewStep";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import Stepper from "@/components/create-vault/Stepper";
import SummaryColumn from "@/components/create-vault/SummaryColumn";
import { Panel } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@heirloom/i18n";
import type { SplTokenAsset } from "@/types";
import { useNow } from "@/hooks/useNow";

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
  const [reachedStep, setReachedStep] = useState<StepIndex>(0);

  // When the onboarding tour highlights a specific wizard step, follow along.
  useEffect(() => {
    if (vaultStep != null && vaultStep >= 0 && vaultStep <= STEPS.length - 1) {
      setStep(vaultStep as StepIndex);
    }
  }, [vaultStep]);

  const now = useNow(60_000);
  const [heartbeatSeconds, setHeartbeatSeconds] = useState(90 * SECONDS_PER_DAY);
  const [graceSeconds, setGraceSeconds] = useState(7 * SECONDS_PER_DAY);
  const [pauseSeconds] = useState(0);

  const [heirAddress, setHeirAddress] = useState("");
  const [label, setLabel] = useState("");
  const [delegate, setDelegate] = useState("");
  const [checkInSigner, setCheckinSigner] = useState("");
  const [rolesOpen, setRolesOpen] = useState(false);

  const { data: tokens, isLoading: tokensLoading } = useWalletSplTokens(
    isConnected ? publicKey : null,
  );
  const { sol: solBalance, loading: solLoading } = useTokenBalances(isConnected ? publicKey : null);

  const [solAmount, setSolAmount] = useState<number>(0);
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

  const trimmedHeir = heirAddress.trim();
  const heirValid = isValidSolanaAddress(trimmedHeir);
  const heirIsOwner = heirValid && publicKey != null && trimmedHeir === publicKey;

  const isHeirValid =
    heirValid && !heirIsOwner && label.trim().length > 0 && label.length <= LABEL_MAX_LEN;

  const signerTrimmed = checkInSigner.trim();
  const guardianTrimmed = delegate.trim();
  const sameKey =
    signerTrimmed.length > 0 && guardianTrimmed.length > 0 && signerTrimmed === guardianTrimmed;

  const canProceed = () => {
    if (step === 0) return isHeirValid;
    if (step === 1) return true; // empty estate allowed
    if (step === 2) return !sameKey;
    return acknowledged;
  };

  const handleSubmit = async () => {
    if (!acknowledged) return;
    if (!isConnected) {
      setWalletDialogOpen(true);
      return;
    }
    try {
      track("vault_creation_started", {
        has_delegate: Boolean(delegate.trim()),
        has_heartbeat_signer: Boolean(checkInSigner.trim()),
        token_count: selectedTokenEntries.length,
      });
      setSubmitState("creating");
      const lamports = toRawTokenAmount(String(solAmount), SOL_DECIMALS);

      const tokenDeposits = selectedTokenEntries.map(([mint, sel]) => {
        const tok = (tokens ?? []).find((item: SplTokenAsset) => item.mint === mint);
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
          : t("createVault.progressEstate"),
      );

      const createTxId = await createEstateOnChain({
        heir: trimmedHeir,
        label: label.trim().slice(0, LABEL_MAX_LEN) || undefined,
        checkInIntervalSecs: heartbeatSeconds,
        gracePeriodSecs: graceSeconds,
        delegatePauseDurationSecs: pauseSeconds,
        amountLamports: lamports,
        delegate: delegate.trim() || undefined,
        checkInSigner: checkInSigner.trim() || undefined,
        tokens: tokenDeposits,
      });
      setTxId(createTxId);
      setSubmitState("complete");
      track("vault_created", {
        has_delegate: Boolean(delegate.trim()),
        has_heartbeat_signer: Boolean(checkInSigner.trim()),
        token_count: tokenDeposits.length,
      });
      toast({
        title: t("createVault.toastCreatedTitle"),
        description: t("createVault.toastCreatedDesc"),
      });
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
  const steps = [
    t("createVault.stepHeirs"),
    t("createVault.stepAssets"),
    t("createVault.stepHeartbeat"),
    t("createVault.stepReview"),
  ];
  const intervalDays = Math.round(heartbeatSeconds / SECONDS_PER_DAY);
  const graceDays = Math.round(graceSeconds / SECONDS_PER_DAY);

  const goToStep = (idx: StepIndex) => {
    if (idx <= reachedStep) setStep(idx);
  };

  const goNext = () => {
    const next = (step + 1) as StepIndex;
    setStep(next);
    setReachedStep((r) => Math.max(r, next) as StepIndex);
  };

  const goBack = () => {
    if (step > 0) setStep((step - 1) as StepIndex);
  };

  const rail = (
    <div className="flex h-[3.75rem] items-center gap-[clamp(0.75rem,1.4vw,1.5rem)] border-b border-tile-line px-[var(--page-pad)]">
      <div className="flex shrink-0 items-baseline gap-3 whitespace-nowrap">
        <span className="font-mono text-xs font-bold uppercase tracking-[0.1em]">
          {t("createVault.wizard.newEstate")}
        </span>
        <span className="text-sm text-muted-foreground">
          {submitState === "complete" ? t("createVault.wizard.done") : `0${step + 1} / 04`}
        </span>
      </div>
      <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
      <Stepper
        steps={steps}
        currentStep={submitState === "complete" ? 4 : step}
        completedSteps={submitState === "complete" ? 4 : reachedStep + 1}
        onStepClick={(idx) => goToStep(idx as StepIndex)}
      />
    </div>
  );

  if (submitState === "complete") {
    const missedDate = new Date(now + intervalDays * 864e5).toLocaleDateString(i18n.language, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return (
      <>
        <div className="min-h-screen overflow-x-clip bg-background">
          <PageHeader onConnectWallet={() => setWalletDialogOpen(true)} />
          {rail}
          <main className="app-shell px-[var(--page-pad)] py-[clamp(1.5rem,6vh,7rem)]">
            <div className="mx-auto flex max-w-xl flex-col items-start gap-6">
              {/* Yellow check circle */}
              <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-yellow">
                <Check className="h-7 w-7 text-foreground" strokeWidth={3} />
              </div>

              <h2 className="ed-h2">{t("createVault.successTitle", { label })}</h2>

              <p className="ed-lede text-muted-foreground">
                {t("createVault.wizard.nextCheckInDue", { date: missedDate })}
              </p>

              {/* Next step cards */}
              <div className="flex w-full flex-col gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-tile-line p-5 text-left transition-colors hover:bg-tile-soft"
                >
                  <span>
                    <b className="block text-sm">{t("createVault.wizard.setUpReminders")}</b>
                    <span className="block text-sm text-muted-foreground">
                      {t("createVault.wizard.setUpRemindersDesc")}
                    </span>
                  </span>
                  <ArrowRight className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-tile-line p-5 text-left transition-colors hover:bg-tile-soft"
                >
                  <span>
                    <b className="block text-sm">{t("createVault.wizard.tellYourHeir")}</b>
                    <span className="block text-sm text-muted-foreground">
                      {t("createVault.wizard.tellYourHeirDesc")}
                    </span>
                  </span>
                  <ArrowRight className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                </button>
              </div>

              <Button variant="flat" size="lg" onClick={() => navigate("/dashboard")}>
                {t("createVault.goToDashboard")}
              </Button>
            </div>
          </main>
        </div>
        <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
      </>
    );
  }

  return (
    <>
      <div
        className="min-h-screen overflow-x-clip bg-background"
        aria-hidden={isSubmitting}
        style={isSubmitting ? { pointerEvents: "none" } : undefined}
      >
        <PageHeader onConnectWallet={() => setWalletDialogOpen(true)} />
        {rail}

        <main className="app-shell px-[var(--page-pad)] py-[clamp(1.5rem,6vh,7rem)]">
          <div className="grid items-start gap-6 lg:grid-cols-12">
            <Panel className="gap-0 lg:col-span-7">
              {step === 0 && (
                <div data-tour="create-vault-heirs">
                  <HeirStep
                    heirAddress={heirAddress}
                    setHeirAddress={setHeirAddress}
                    label={label}
                    setLabel={setLabel}
                    ownerAddress={publicKey}
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
                    checkInSigner={checkInSigner}
                    setCheckinSigner={setCheckinSigner}
                    delegate={delegate}
                    setDelegate={setDelegate}
                    rolesOpen={rolesOpen}
                    setRolesOpen={setRolesOpen}
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
                    checkInSigner={checkInSigner}
                    solAmount={solAmount}
                    tokenSelections={tokenSelections}
                    tokens={tokens}
                    acknowledged={acknowledged}
                    setAcknowledged={setAcknowledged}
                    onEdit={(targetStep) => setStep(targetStep as StepIndex)}
                    onEditExtraSafety={() => {
                      setStep(2);
                      setRolesOpen(true);
                    }}
                  />
                </div>
              )}

              <div className="mt-8 flex items-center justify-between gap-3 border-t border-tile-line pt-5">
                {step > 0 ? (
                  <Button
                    variant="flat-outline"
                    size="default"
                    onClick={goBack}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-4 w-4" /> {t("createVault.back")}
                  </Button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-4">
                  {step === 3 && (
                    <span className="text-xs text-muted-foreground">
                      {t("createVault.wizard.estFeeTilde")}
                    </span>
                  )}
                  {step < 3 ? (
                    <Button
                      variant="flat"
                      size="default"
                      onClick={goNext}
                      disabled={!canProceed() || isSubmitting}
                    >
                      {step === 1 && !hasAnyDeposit ? (
                        t("createVault.skipForNow")
                      ) : (
                        <>
                          {t("createVault.next")}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="flat"
                      size="default"
                      onClick={handleSubmit}
                      disabled={!canProceed() || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("createVault.creating")}
                        </>
                      ) : (
                        t("createVault.createEstate")
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Panel>

            <div className="lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)] lg:col-span-5">
              <Panel tone="soft">
                <SummaryColumn
                  step={step}
                  label={label}
                  heirAddress={heirAddress}
                  solAmount={solAmount}
                  tokenSelections={tokenSelections}
                  tokens={tokens}
                  intervalDays={intervalDays}
                  graceDays={graceDays}
                  delegate={delegate}
                  checkInSigner={checkInSigner}
                />
              </Panel>
            </div>
          </div>
        </main>
      </div>

      {submitState !== "idle" && submitState !== "error" && (
        <SubmitOverlay submitState={submitState} submitProgress={submitProgress} txId={txId} />
      )}
      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

export default CreateVaultPage;
