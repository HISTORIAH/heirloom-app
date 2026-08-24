import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { useWalletSplTokens } from "@/hooks/useWalletSplTokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { SOL_DECIMALS } from "@/lib/constants";
import {
  errMsg,
  getClusterFromEndpoint,
  getSolanaExplorerTxUrl,
  toRawTokenAmount,
} from "@/lib/utils";
import { FEATURE_NOTIFICATIONS_UI, FEATURE_YIELD_STAKING_UI } from "@/config";
import { Mosaic, Tile } from "@/components/surface/Mosaic";
import { EstateStatusTile } from "@/components/dashboard/EstateStatusTile";
import { EstateAssetsPanel } from "@/components/dashboard/EstateAssetsPanel";
import { EstateHeirTile } from "@/components/dashboard/EstateHeirTile";
import { EstateManagePanel } from "@/components/dashboard/EstateManagePanel";
import { LuloEnableDialog } from "@/components/dashboard/LuloEnableDialog";
import { RecallConfirmDialog } from "@/components/dashboard/RecallConfirmDialog";
import { StakingEnableDialog } from "@/components/dashboard/StakingEnableDialog";
import { StrategyProgressOverlay } from "@/components/dashboard/StrategyProgressOverlay";
import NotificationsCard from "@/components/dashboard/NotificationsCard";
import NotificationsSignInPanel from "@/components/dashboard/NotificationsSignInPanel";
import NotificationsDialog from "@/components/dashboard/NotificationsDialog";
import {
  defaultNotificationsConfig,
  summarizeNotifications,
  type NotificationsCardStatus,
  type NotificationsConfig,
} from "@/types/notifications";
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
 * One estate, laid out as a mosaic. The status tile and the assets panel share
 * the top band because they are the two things an owner opens the dashboard
 * for; everything below is reference or a mutation.
 */
export const EstateCard: React.FC<{ estate: EstateData }> = ({ estate }) => {
  const { sendHeartbeatOnChain, depositSolOnChain, depositTokenOnChain, fetchEstates } = useVault();
  const { publicKey, isConnected } = useWallet();
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
  const [topUpOpen, setTopUpOpen] = useState<"sol" | string | null>(null);
  const [topUpLoading, setTopUpLoading] = useState(false);

  // TODO: Placeholder notifications state — per-estate local state (replace with real fetch/sign/save later)
  const [notifStatus, setNotifStatus] = useState<NotificationsCardStatus>("locked");
  const [notifSummary, setNotifSummary] = useState<string | undefined>(undefined);
  const [notifConfig, setNotifConfig] = useState<NotificationsConfig>(defaultNotificationsConfig());
  const [notifSignInOpen, setNotifSignInOpen] = useState(false);
  const [notifEditOpen, setNotifEditOpen] = useState(false);
  const [notifSigning, setNotifSigning] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  const handleNotifAction = () => {
    if (notifStatus === "authorized") {
      setNotifEditOpen(true);
      return;
    }
    setNotifSignInOpen(true);
  };

  // TODO: replace with a real challenge fetch (POST /challenge) + wallet signMessage/signIn + backend verification
  const handleNotifSign = () => {
    setNotifSigning(true);
    setTimeout(() => {
      setNotifSigning(false);
      setNotifSignInOpen(false);
      setNotifStatus("authorized");
      setNotifEditOpen(true);
    }, 600);
  };

  // TODO: replace with a real save call (PUT /estates/:pda/notifications) reusing the active session
  const handleNotifSave = (next: NotificationsConfig) => {
    setNotifSaving(true);
    setTimeout(() => {
      setNotifSaving(false);
      setNotifConfig(next);
      setNotifEditOpen(false);
      setNotifSummary(summarizeNotifications(next, estate.label, t));
    }, 400);
  };

  const notifSignMessage = t("notifications.signMessageBody", {
    estate: estate.estatePda,
    wallet: publicKey ?? "",
  });

  const { data: walletSplTokens } = useWalletSplTokens(
    topUpOpen !== null && isConnected ? publicKey : null,
  );
  const { sol: walletSolBalance } = useTokenBalances(
    topUpOpen !== null && isConnected ? publicKey : null,
  );

  const handleTopUp = async (amount: number) => {
    if (amount <= 0 || !topUpOpen) return;
    setTopUpLoading(true);
    try {
      let tx: string;
      if (topUpOpen === "sol") {
        tx = await depositSolOnChain(estate.vaultPda, toRawTokenAmount(amount, SOL_DECIMALS));
      } else {
        const holding = estate.vaultTokens.find((vt) => vt.mint === topUpOpen);
        if (!holding) throw new Error("Token not found in vault");
        tx = await depositTokenOnChain(holding, toRawTokenAmount(amount, holding.decimals));
      }
      setLastTxId(tx);
      setTopUpOpen(null);
      track("vault_top_up_succeeded", { asset_type: topUpOpen === "sol" ? "sol" : "token" });
      toast({ title: t("dashboard.toastTopUpTitle"), description: t("dashboard.toastTopUpDesc") });
      await fetchEstates();
    } catch (err: unknown) {
      track("vault_top_up_failed", { asset_type: topUpOpen === "sol" ? "sol" : "token" });
      toast({
        title: t("dashboard.toastTopUpFailTitle"),
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setTopUpLoading(false);
    }
  };

  const vaultEmpty = isVaultEmpty(estate);
  const vaultMints = estate.vaultTokens.map((vt) => vt.mint);
  const { metadata: tokenMeta } = useTokenMetadata(vaultMints);
  const initial = computeTick(estate, vaultEmpty, t);
  const [countdown, setCountdown] = useState<CountdownParts>(initial.countdown);
  const [computedState, setComputedState] = useState<UiState>(initial.state);
  const [countdownLabel, setCountdownLabel] = useState(initial.label);

  useEffect(() => {
    const tick = () => {
      const r = computeTick(estate, vaultEmpty, t);
      setCountdown(r.countdown);
      setComputedState(r.state);
      setCountdownLabel(r.label);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [estate, vaultEmpty, t]);

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
      <Mosaic className="[--row-unit:3.5rem]">
        <Tile col={7} colMd={6} row={8} bare tone="plain">
          <EstateStatusTile
            state={computedState}
            countdown={countdown}
            countdownLabel={countdownLabel}
            sending={sendingHeartbeat}
            onCheckIn={handleHeartbeat}
            className="flex-1"
          />
        </Tile>

        <Tile col={5} colMd={6} row={8} bare tone="plain">
          <EstateAssetsPanel
            estate={estate}
            tokenMeta={tokenMeta}
            walletSplTokens={walletSplTokens}
            walletSolBalance={walletSolBalance}
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
            topUpOpen={topUpOpen}
            onTopUpOpen={setTopUpOpen}
            onTopUpCancel={() => setTopUpOpen(null)}
            onTopUpConfirm={handleTopUp}
            topUpLoading={topUpLoading}
            className="flex-1"
          />
        </Tile>

        {lastTxId && (
          <Tile col={12} colMd={6} row={1} bare tone="plain">
            <a
              href={getSolanaExplorerTxUrl(lastTxId)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center gap-2 rounded-xl border border-tile-line px-5 py-4 text-sm font-semibold transition-colors hover:bg-tile-soft"
            >
              <ExternalLink className="h-4 w-4" />
              {t("dashboard.viewLatestTx")}
            </a>
          </Tile>
        )}

        <Tile col={12} colMd={6} row={1} bare tone="plain">
          <EstateHeirTile estate={estate} className="flex-1" />
        </Tile>

        {FEATURE_NOTIFICATIONS_UI && (
          <Tile col={12} colMd={6} row={1} bare tone="plain">
            <NotificationsCard
              status={notifStatus}
              summary={notifSummary}
              onAction={handleNotifAction}
            />
          </Tile>
        )}

        {computedState !== "distributed" && (
          <Tile col={12} colMd={6} row={2} bare tone="plain">
            <EstateManagePanel estate={estate} onTx={setLastTxId} className="flex-1" />
          </Tile>
        )}
      </Mosaic>

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

      {FEATURE_NOTIFICATIONS_UI && (
        <>
          <NotificationsSignInPanel
            open={notifSignInOpen}
            message={notifSignMessage}
            signing={notifSigning}
            onClose={() => setNotifSignInOpen(false)}
            onSign={handleNotifSign}
          />

          <NotificationsDialog
            open={notifEditOpen}
            heirLabel={estate.label}
            initialConfig={notifConfig}
            saving={notifSaving}
            onClose={() => setNotifEditOpen(false)}
            onSave={handleNotifSave}
          />
        </>
      )}
    </>
  );
};
