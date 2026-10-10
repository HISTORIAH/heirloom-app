import { useEffect, useState } from "react";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { useReminders, useSaveHeirName } from "@/hooks/useReminders";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { SOL_DECIMALS, WRAPPED_SOL_MINT } from "@/lib/constants";
import { errMsg, getClusterFromEndpoint } from "@/lib/utils";
import { FEATURE_YIELD_STAKING_UI } from "@/config";
import { EstateStatusTile } from "@/components/dashboard/EstateStatusTile";
import { EstateAssetsPanel } from "@/components/dashboard/EstateAssetsPanel";
import { EstateHeirTile } from "@/components/dashboard/EstateHeirTile";
import { EstateManagePanel } from "@/components/dashboard/EstateManagePanel";
import { LuloEnableDialog } from "@/components/dashboard/LuloEnableDialog";
import { RecallConfirmDialog } from "@/components/dashboard/RecallConfirmDialog";
import { StakingEnableDialog } from "@/components/dashboard/StakingEnableDialog";
import { StrategyProgressOverlay } from "@/components/dashboard/StrategyProgressOverlay";
import { EstateNotifications } from "@/components/dashboard/EstateNotifications";
import { makePlaceholderLuloStrategy, makePlaceholderStakingStrategy } from "@/lib/strategies";
import type { Strategy, StrategyProgressStep } from "@/types/strategy-ui";
import type { VaultTokenHolding } from "@/types";
import {
  computeTick,
  isVaultEmpty,
  type CountdownParts,
  type UiState,
} from "@/components/dashboard/estateState";
import { useTranslation } from "@heirloom/i18n";

/**
 * One estate as a 2×2: status beside heir, assets beside manage, notifications under all four.
 */
export const EstateCard: React.FC<{ estate: EstateData }> = ({ estate }) => {
  const { sendHeartbeatOnChain } = useVault();
  const { account } = useWallet();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { t } = useTranslation("app");
  const [sendingHeartbeat, setSendingHeartbeat] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);

  const [luloTargetMint, setLuloTargetMint] = useState<string | null>(null);
  const [luloDialogOpen, setLuloDialogOpen] = useState(false);
  const [recallDialogOpen, setRecallDialogOpen] = useState(false);
  const [recallTarget, setRecallTarget] = useState<"lulo" | "staking" | null>(null);
  const [activeStrategyType, setActiveStrategyType] = useState<"lulo" | "staking">("lulo");
  const [strategyProgress, setStrategyProgress] = useState<StrategyProgressStep>("idle");
  const [showProgressOverlay, setShowProgressOverlay] = useState(false);

  const [stakingDialogOpen, setStakingDialogOpen] = useState(false);

  // TEMP: network-aware feature toggle for yield/staking.
  // Mainnet: always show. Devnet/local: only show if VITE_FEATURE_YIELD_STAKING_UI=true.
  // TODO: Remove once feature ships to all networks.
  const cluster = getClusterFromEndpoint();
  const showYieldStaking = cluster === "solana:mainnet" || FEATURE_YIELD_STAKING_UI;

  // TODO:Placeholder strategies — per-estate local state (replace with real data later)
  const [luloStrategy, setLuloStrategy] = useState<Strategy | null>(null);
  const [stakingStrategy, setStakingStrategy] = useState<Strategy | null>(null);

  // The heir's name lives in the reminders profile. This shares the notifications card's
  // query, so it resolves once the owner has a session; until then the heir shows as an address.
  const reminders = useReminders(account ? estate.estatePda : "");
  const heirProfile = reminders.data?.heir ?? null;
  const heirName = heirProfile?.heirName?.trim() || null;
  const hasReminders = (reminders.data?.recipients.length ?? 0) > 0;
  const saveHeirName = useSaveHeirName(estate.estatePda);
  const [remindersRequest, setRemindersRequest] = useState(0);

  const handleSaveHeirName = async (name: string) => {
    try {
      await saveHeirName.mutateAsync({ heirName: name, current: heirProfile });
    } catch (err) {
      toast({
        title: t("dashboard.heirNameSaveFailed"),
        description: errMsg(err),
        variant: "destructive",
      });
      throw err;
    }
  };

  const vaultEmpty = isVaultEmpty(estate);
  const vaultMints = estate.vaultTokens.map((vt) => vt.mint);
  const { metadata: tokenMeta } = useTokenMetadata(vaultMints);
  const { data: prices, isLoading: pricesLoading } = useTokenPrices([
    WRAPPED_SOL_MINT,
    ...vaultMints,
  ]);
  const initial = computeTick(estate, vaultEmpty);
  const [countdown, setCountdown] = useState<CountdownParts>(initial.countdown);
  const [computedState, setComputedState] = useState<UiState>(initial.state);

  useEffect(() => {
    const tick = () => {
      const r = computeTick(estate, vaultEmpty);
      setCountdown(r.countdown);
      setComputedState(r.state);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [estate, vaultEmpty]);

  const handleHeartbeat = async () => {
    setSendingHeartbeat(true);
    try {
      const tx = await sendHeartbeatOnChain(estate.heir);
      setLastTxId(tx);
      track("heartbeat_succeeded", { source: "dashboard" });
      toast({
        title: t("dashboard.toastHeartbeatTitle"),
        description: t("dashboard.toastHeartbeatDesc"),
      });
    } catch (err: unknown) {
      track("heartbeat_failed", { source: "dashboard" });
      toast({
        title: t("dashboard.toastHeartbeatFailTitle"),
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setSendingHeartbeat(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Strategy handlers (placeholder flows)
  // ---------------------------------------------------------------------------

  const activeLuloHolding = luloTargetMint
    ? estate.vaultTokens.find((vt) => vt.mint === luloTargetMint)
    : null;
  const luloTokenMeta = activeLuloHolding ? tokenMeta.get(activeLuloHolding.mint) : undefined;
  const luloSymbol = luloTokenMeta?.symbol;
  const luloVaultBalance = activeLuloHolding
    ? Number(activeLuloHolding.rawAmount) / 10 ** activeLuloHolding.decimals
    : 0;

  const solVaultBalance = Number(estate.solBalance) / 10 ** SOL_DECIMALS;

  const handleEnableLulo = (holding: VaultTokenHolding) => {
    setLuloTargetMint(holding.mint);
    setActiveStrategyType("lulo");
    setLuloDialogOpen(true);
  };

  const handleConfirmLulo = async (opts: { protected: boolean }) => {
    if (!luloTargetMint) return;
    const targetHolding = estate.vaultTokens.find((vt) => vt.mint === luloTargetMint);
    if (!targetHolding) return;
    setLuloDialogOpen(false);
    setShowProgressOverlay(true);
    setStrategyProgress("withdrawing");

    // Step 1: simulate vault withdrawal
    await new Promise((r) => setTimeout(r, 1500));
    setStrategyProgress("depositing");

    // Step 2: simulate Lulo deposit
    await new Promise((r) => setTimeout(r, 1500));
    setStrategyProgress("complete");

    // Activate placeholder strategy
    setLuloStrategy(
      makePlaceholderLuloStrategy(targetHolding.mint, targetHolding.decimals, {
        protected: opts.protected,
        amount: Number(targetHolding.rawAmount) / 10 ** targetHolding.decimals,
        apy: opts.protected ? 6.2 : 8.5,
      }),
    );

    await new Promise((r) => setTimeout(r, 800));
    setShowProgressOverlay(false);
    setStrategyProgress("idle");
    setLuloTargetMint(null);
    toast({ title: t("dashboard.toastLuloTitle"), description: t("dashboard.toastLuloDesc") });
  };

  const handleRecallLulo = () => {
    setRecallTarget("lulo");
    setRecallDialogOpen(true);
  };

  const handleRecallStaking = () => {
    setRecallTarget("staking");
    setRecallDialogOpen(true);
  };

  const handleConfirmRecall = async () => {
    setRecallDialogOpen(false);
    setShowProgressOverlay(true);
    setStrategyProgress("recalling");

    // Step 1: simulate Lulo/staking withdrawal
    await new Promise((r) => setTimeout(r, 1500));
    setStrategyProgress("returning");

    // Step 2: simulate return to vault
    await new Promise((r) => setTimeout(r, 1500));
    setStrategyProgress("complete");

    // Deactivate strategy
    if (recallTarget === "lulo") setLuloStrategy(null);
    if (recallTarget === "staking") setStakingStrategy(null);

    await new Promise((r) => setTimeout(r, 800));
    setShowProgressOverlay(false);
    setStrategyProgress("idle");
    setRecallTarget(null);
    toast({ title: t("dashboard.toastRecallTitle"), description: t("dashboard.toastRecallDesc") });
  };

  const handleEnableStaking = () => {
    setActiveStrategyType("staking");
    setStakingDialogOpen(true);
  };

  const handleConfirmStaking = async (validatorId: string) => {
    setStakingDialogOpen(false);
    setShowProgressOverlay(true);
    setStrategyProgress("withdrawing");

    // Step 1: simulate vault withdrawal
    await new Promise((r) => setTimeout(r, 1500));
    setStrategyProgress("depositing");

    // Step 2: simulate delegation to validator
    await new Promise((r) => setTimeout(r, 1500));
    setStrategyProgress("complete");

    setStakingStrategy(
      makePlaceholderStakingStrategy({ amount: solVaultBalance, validatorName: validatorId }),
    );

    await new Promise((r) => setTimeout(r, 800));
    setShowProgressOverlay(false);
    setStrategyProgress("idle");
    toast({
      title: t("dashboard.toastStakingTitle"),
      description: t("dashboard.toastStakingDesc", { validator: validatorId }),
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 items-stretch gap-5 min-[860px]:grid-cols-[1.45fr_1fr]">
        <EstateStatusTile
          estate={estate}
          state={computedState}
          countdown={countdown}
          lastTxId={lastTxId}
          sending={sendingHeartbeat}
          onCheckIn={handleHeartbeat}
        />
        <EstateHeirTile
          estate={estate}
          heirName={heirName}
          onSaveName={reminders.isSuccess && hasReminders ? handleSaveHeirName : undefined}
          onSetUpName={account ? () => setRemindersRequest((n) => n + 1) : undefined}
        />
        <EstateAssetsPanel
          estate={estate}
          tokenMeta={tokenMeta}
          prices={prices}
          pricesLoading={pricesLoading}
          showYieldStaking={showYieldStaking}
          stakingStrategy={stakingStrategy}
          luloStrategy={luloStrategy?.type === "lulo" ? luloStrategy : null}
          onEnableStaking={handleEnableStaking}
          onRecallStaking={handleRecallStaking}
          onEnableLulo={handleEnableLulo}
          onRecallLulo={handleRecallLulo}
          strategyProgress={strategyProgress}
          progressVisible={showProgressOverlay}
          recallTarget={recallTarget}
          luloTargetMint={luloTargetMint}
          className={computedState === "distributed" ? "col-span-full" : undefined}
        />
        {computedState !== "distributed" && (
          <EstateManagePanel estate={estate} heirName={heirName} onTx={setLastTxId} />
        )}
        {account && (
          <EstateNotifications estate={estate} account={account} openRequest={remindersRequest} />
        )}
      </div>

      {showYieldStaking && activeLuloHolding && (
        <LuloEnableDialog
          open={luloDialogOpen}
          tokenSymbol={luloSymbol || t("dashboard.tokensFallback")}
          tokenMint={activeLuloHolding.mint}
          vaultBalance={luloVaultBalance}
          onConfirm={handleConfirmLulo}
          onCancel={() => {
            setLuloDialogOpen(false);
            setLuloTargetMint(null);
          }}
          loading={showProgressOverlay}
        />
      )}

      {showYieldStaking && (
        <StakingEnableDialog
          open={stakingDialogOpen}
          solBalance={solVaultBalance}
          onConfirm={handleConfirmStaking}
          onCancel={() => setStakingDialogOpen(false)}
          loading={showProgressOverlay}
        />
      )}

      {showYieldStaking && (
        <RecallConfirmDialog
          open={recallDialogOpen}
          strategyType={recallTarget === "staking" ? "staking" : "lulo"}
          tokenSymbol={recallTarget === "lulo" ? luloSymbol : undefined}
          routedAmount={
            recallTarget === "lulo" && luloStrategy?.type === "lulo"
              ? luloStrategy.amount
              : recallTarget === "staking" && stakingStrategy?.type === "staking"
                ? stakingStrategy.amount
                : 0
          }
          onConfirm={handleConfirmRecall}
          onCancel={() => {
            if (!showProgressOverlay) {
              setRecallDialogOpen(false);
              setRecallTarget(null);
            }
          }}
          loading={showProgressOverlay}
        />
      )}

      {showYieldStaking && (
        <StrategyProgressOverlay
          open={showProgressOverlay}
          strategyType={activeStrategyType}
          step={strategyProgress}
        />
      )}
    </>
  );
};
