import PageHeader from "@/components/PageHeader";
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
import { ArrowLeft, ArrowRight, Bell, Loader2 } from "lucide-react";
import { errMsg } from "@/lib/utils";
import { FEATURE_NOTIFICATIONS_UI } from "@/config";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import Stepper from "@/components/create-vault/Stepper";
import SummaryColumn from "@/components/create-vault/SummaryColumn";
import { Panel } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@heirloom/i18n";
import type { SplTokenAsset } from "@/types";

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

  const { data: tokens, isLoading: tokensLoading } = useWalletSplTokens(
    isConnected ? publicKey : null,
  );
  const { sol: solBalance, loading: solLoading } = useTokenBalances(
    isConnected ? publicKey : null,
  );

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

  const isHeirValid =
    heirAddress.trim().length >= 32 && label.trim().length > 0 && label.length <= LABEL_MAX_LEN;

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
  const totalDays =
    Math.round(heartbeatSeconds / SECONDS_PER_DAY) + Math.round(graceSeconds / SECONDS_PER_DAY);
  const intervalDays = Math.round(heartbeatSeconds / SECONDS_PER_DAY);
  const graceDays = Math.round(graceSeconds / SECONDS_PER_DAY);

  const resetForm = () => {
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
  };

  const rail = (
    <div className="flex h-[3.75rem] items-center gap-[clamp(0.75rem,1.4vw,1.5rem)] border-b border-tile-line px-[var(--page-pad)]">
      <span className="truncate text-[11px] font-bold uppercase leading-none tracking-[0.18em]">
        {submitState === "complete" ? t("createVault.successTitle") : steps[step]}
      </span>
      <span className="shrink-0 font-display text-[13px] font-bold leading-none tabular-nums text-muted-foreground">
        {submitState === "complete" ? "04" : String(step + 1).padStart(2, "0")} / 04
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
      <Stepper
        steps={steps}
        currentStep={submitState === "complete" ? 4 : step}
        completedSteps={submitState === "complete" ? 4 : step}
        onStepClick={(idx) => {
          if (submitState !== "complete" && idx < step) setStep(idx as StepIndex);
        }}
      />
    </div>
  );

  if (submitState === "complete") {
    return (
      <>
        <div className="min-h-screen overflow-x-clip bg-background">
          <PageHeader
            title={t("createVault.title")}
            onConnectWallet={() => setWalletDialogOpen(true)}
          />
          {rail}
          <main className="px-[var(--page-pad)] py-[clamp(1.5rem,3.5vh,3rem)]">
            <Panel className="mx-auto max-w-xl text-center">
              <span className="ed-label inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent-green" />
                {t("createVault.wizard.confirmed")}
              </span>
              <h2 className="ed-h2 mt-3">{t("createVault.successTitle")}</h2>
              <p className="ed-lede mx-auto mt-4 max-w-[42ch] text-muted-foreground">
                <strong>{label || t("createVault.yourHeir")}</strong> (
                {truncateAddress(heirAddress)}) {t("createVault.successBody1")}{" "}
                <strong>
                  {totalDays} {t("createVault.successBody2")}
                </strong>
                . {t("createVault.successBody3")}{" "}
                <strong>
                  {new Date(Date.now() + intervalDays * 864e5).toLocaleDateString(i18n.language, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
                .
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button variant="flat-yellow" size="lg" onClick={() => navigate("/dashboard")}>
                  {t("createVault.goToDashboard")}
                </Button>
                <Button variant="flat-outline" size="lg" onClick={resetForm}>
                  {t("createVault.createAnother")}
                </Button>
              </div>
              {FEATURE_NOTIFICATIONS_UI && (
                <p className="mt-6 flex items-center justify-center gap-2 border-t border-tile-line pt-5 text-sm font-medium text-muted-foreground">
                  <Bell className="h-4 w-4" strokeWidth={2} />
                  {t("createVault.remindersNote")}
                </p>
              )}
            </Panel>
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
        <PageHeader
          title={t("createVault.title")}
          onConnectWallet={() => setWalletDialogOpen(true)}
        />
        {rail}

        <main className="px-[var(--page-pad)] py-[clamp(1.5rem,3.5vh,3rem)]">
          <div className="grid items-start gap-6 lg:grid-cols-12">
            <Panel className="gap-0 lg:col-span-7">
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

              <div className="mt-8 flex items-center justify-between gap-3 border-t border-tile-line pt-5">
                <Button
                  variant="flat-outline"
                  size="default"
                  onClick={() => setStep((s) => (s > 0 ? ((s - 1) as StepIndex) : s))}
                  disabled={step === 0 || isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4" /> {t("createVault.back")}
                </Button>

                {step < 3 ? (
                  <Button
                    variant="flat"
                    size="default"
                    onClick={() => setStep((s) => (s + 1) as StepIndex)}
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
                  hbSigner={hbSigner}
                />
              </Panel>
            </div>
          </div>
        </main>
      </div>

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
