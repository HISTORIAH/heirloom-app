import PageHeader from "@/components/PageHeader";
import { useState, useMemo, useEffect, useCallback } from "react";
import SigningModal from "@/components/create-vault/SigningModal";
import { useWallet } from "@/contexts/WalletContext";
import type { CreateEstateInput } from "@/contexts/VaultContext";
import { useTour } from "@/contexts/TourContext";
import { useNavigate } from "react-router-dom";
import { SOL_DECIMALS, LABEL_MAX_LEN, SECONDS_PER_DAY, SOL_LABEL } from "@/lib/constants";
import { formatSol, isValidSolanaAddress, toRawTokenAmount, truncateAddress } from "@/lib/utils";
import { useWalletSplTokens } from "@/hooks/useWalletSplTokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import HeartbeatStep from "@/components/create-vault/HeartbeatStep";
import HeirStep from "@/components/create-vault/HeirStep";
import DepositStep from "@/components/create-vault/DepositStep";
import ReviewStep from "@/components/create-vault/ReviewStep";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import Stepper from "@/components/create-vault/Stepper";
import SummaryColumn from "@/components/create-vault/SummaryColumn";
import { Panel } from "@/components/surface/Panel";
import { Button } from "@/components/ui/button";
import { Trans, useTranslation } from "@heirloom/i18n";
import type { SplTokenAsset } from "@/types";
import type { CreateAssetId } from "@/types/create";
import {
  useCreateEstate,
  useCreateEstateCost,
  useCreateEstatePreview,
} from "@/hooks/useCreateEstate";
import { useEstateDates } from "@/components/create-vault/estateTiming";

const STEPS = ["HEIRS", "ASSETS", "HEARTBEAT", "REVIEW"] as const;

type StepIndex = 0 | 1 | 2 | 3;

export interface TokenSelection {
  mint: string;
  amount: number; // UI amount (raw / 10^decimals)
  pct: number; // 25, 50, 75, 100
}

const CreateVaultPage = () => {
  const { publicKey, isConnected } = useWallet();
  const { vaultStep } = useTour();
  const navigate = useNavigate();
  const { track } = useAnalytics();
  const { t } = useTranslation("app");
  const date = useEstateDates();

  const [step, setStep] = useState<StepIndex>(0);
  const [reachedStep, setReachedStep] = useState<StepIndex>(0);

  // When the onboarding tour highlights a specific wizard step, follow along.
  useEffect(() => {
    if (vaultStep != null && vaultStep >= 0 && vaultStep <= STEPS.length - 1) {
      setStep(vaultStep as StepIndex);
    }
  }, [vaultStep]);

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

  const creation = useCreateEstate();
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

  /** Everything the create transactions need, or null until there's an estate to create. */
  const createInput = useMemo((): CreateEstateInput | null => {
    const heir = heirAddress.trim();
    const hasAssets = solAmount > 0 || selectedTokenEntries.length > 0;
    if (!isValidSolanaAddress(heir) || !hasAssets) return null;
    return {
      heir,
      label: label.trim().slice(0, LABEL_MAX_LEN) || undefined,
      checkInIntervalSecs: heartbeatSeconds,
      gracePeriodSecs: graceSeconds,
      delegatePauseDurationSecs: pauseSeconds,
      amountLamports: toRawTokenAmount(String(solAmount), SOL_DECIMALS),
      delegate: delegate.trim() || undefined,
      checkInSigner: checkInSigner.trim() || undefined,
      tokens: selectedTokenEntries.map(([mint, sel]) => {
        const tok = (tokens ?? []).find((item: SplTokenAsset) => item.mint === mint);
        const decimals = tok?.decimals ?? 9;
        return {
          mint,
          amount: toRawTokenAmount(sel.amount, decimals),
          decimals,
          tokenProgram: tok?.tokenProgram,
        };
      }),
    };
  }, [
    heirAddress,
    label,
    heartbeatSeconds,
    graceSeconds,
    pauseSeconds,
    solAmount,
    delegate,
    checkInSigner,
    selectedTokenEntries,
    tokens,
  ]);

  // Planned on the review step, so the footer can say how many signatures it takes.
  const preview = useCreateEstatePreview(step === 3 && isConnected ? createInput : null);
  const signatureCount = preview?.transactions.length ?? 1;
  const costLamports = useCreateEstateCost(selectedTokenEntries.length, signatureCount);
  const requiredSol =
    costLamports === null ? null : formatSol(costLamports + solAmount * 10 ** SOL_DECIMALS);

  const assetLabel = useCallback(
    (asset: CreateAssetId) => {
      if (asset === "sol") return SOL_LABEL;
      const tok = (tokens ?? []).find((item) => item.mint === asset);
      return tok?.symbol || tok?.name || truncateAddress(asset, 4);
    },
    [tokens],
  );

  const handleSubmit = async () => {
    if (!acknowledged || !createInput) return;
    if (!isConnected) {
      setWalletDialogOpen(true);
      return;
    }
    const analytics = {
      has_delegate: Boolean(delegate.trim()),
      has_heartbeat_signer: Boolean(checkInSigner.trim()),
      token_count: selectedTokenEntries.length,
    };
    track("vault_creation_started", analytics);
    const created = await creation.start(createInput, preview);
    track(
      created ? "vault_created" : "vault_creation_failed",
      created ? analytics : { stage: "transaction" },
    );
  };

  const handleRetry = async () => {
    const created = await creation.retry();
    if (created) {
      track("vault_created", {
        has_delegate: Boolean(delegate.trim()),
        has_heartbeat_signer: Boolean(checkInSigner.trim()),
        token_count: selectedTokenEntries.length,
      });
    }
  };

  const isSubmitting = creation.progress != null;
  const isComplete = creation.progress?.status === "done";
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
          {isComplete ? t("createVault.wizard.done") : `0${step + 1} / 04`}
        </span>
      </div>
      <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
      <Stepper
        steps={steps}
        currentStep={isComplete ? 4 : step}
        completedSteps={isComplete ? 4 : reachedStep + 1}
        onStepClick={(idx) => goToStep(idx as StepIndex)}
      />
    </div>
  );

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
          <div className="grid items-start gap-[1.6rem] min-[860px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Panel className="gap-0">
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

                <div className="ml-auto flex flex-wrap items-center justify-end gap-4">
                  {step === 3 && costLamports !== null && (
                    <span className="text-right text-[0.78rem] tabular-nums text-muted-foreground">
                      <Trans
                        t={t}
                        i18nKey="createVault.review.totalCost"
                        values={{ amount: formatSol(costLamports) }}
                        components={{
                          b: <b className="font-mono font-semibold text-foreground" />,
                        }}
                      />
                      {preview && (
                        <>
                          <br />
                          {t("createVault.review.costNote", { count: signatureCount })}
                        </>
                      )}
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
                      {t("createVault.review.signAndCreate")}
                    </Button>
                  )}
                </div>
              </div>
            </Panel>

            <div className="min-[860px]:sticky min-[860px]:top-[calc(var(--nav-h)+1.5rem)]">
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

      {creation.progress && (
        <SigningModal
          progress={creation.progress}
          draft={creation.draft}
          assetCount={selectedTokenEntries.length + (solAmount > 0 ? 1 : 0)}
          assetLabel={assetLabel}
          nextCheckInDate={date.short(intervalDays)}
          requiredSol={requiredSol}
          onRetry={handleRetry}
          onBackToReview={creation.close}
          onDone={() => navigate("/dashboard")}
        />
      )}
      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

export default CreateVaultPage;
