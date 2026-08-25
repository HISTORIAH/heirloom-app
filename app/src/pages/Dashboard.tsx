import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import AppFrame, { PageHead } from "@/components/app/AppFrame";
import { Panel } from "@/components/app/Panel";
import Sheet from "@/components/app/Sheet";
import { useWallet } from "@/contexts/WalletContext";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { SOL_DECIMALS, SOL_LABEL } from "@/lib/constants";
import { getSolanaExplorerTxUrl, getClusterFromEndpoint } from "@/lib/utils";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { useWalletSplTokens } from "@/hooks/useWalletSplTokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import VaultMark from "@/components/landing/VaultMark";
import ReassignHeirSection from "@/components/dashboard/ReassignHeirSection";
import EditSettingsSection from "@/components/dashboard/EditSettingsSection";
import AddAssetSection from "@/components/dashboard/AddAssetSection";
import EmergencyWithdrawSection from "@/components/dashboard/EmergencyWithdrawSection";
import NotificationsCard from "@/components/dashboard/NotificationsCard";
import NotificationsSignInPanel from "@/components/dashboard/NotificationsSignInPanel";
import NotificationsDialog from "@/components/dashboard/NotificationsDialog";
import {
  type NotificationsCardStatus,
  type NotificationsConfig,
  defaultNotificationsConfig,
  summarizeNotifications,
} from "@/types/notifications";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import TokenRow from "@/components/dashboard/TokenRow";
import { SolStakingIndicator } from "@/components/dashboard/SolStakingIndicator";
import { LuloEnableDialog } from "@/components/dashboard/LuloEnableDialog";
import { RecallConfirmDialog } from "@/components/dashboard/RecallConfirmDialog";
import { StrategyProgressOverlay } from "@/components/dashboard/StrategyProgressOverlay";
import { TopUpDialog } from "@/components/dashboard/TopUpDialog";
import { StakingEnableDialog } from "@/components/dashboard/StakingEnableDialog";
import {
  type Strategy,
  type StrategyProgressStep,
} from "@/types/strategy-ui";
import {
  makePlaceholderLuloStrategy,
  makePlaceholderStakingStrategy,
} from "@/lib/strategies";
import { FEATURE_YIELD_STAKING_UI, FEATURE_NOTIFICATIONS_UI } from "@/config";
import { cn, formatSol, errMsg, toRawTokenAmount } from "@/lib/utils";
import { computeEstateState } from "@/services/heirloom";
import { useTranslation } from "@heirloom/i18n";
import {
  Heart,
  Coins,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Plus,
  TrendingUp,
  Wallet,
  Sprout,
  Search,
} from "lucide-react";

const ESTATE_STRIP_CAP = 5;

type UiState = "active" | "grace" | "claimable" | "distributed";

/**
 * The four states, each with the one fill it is allowed to wear. Sage means
 * alive and nothing else, yellow marks the window that still has a way out,
 * red is the state the owner can no longer undo. Distributed is spent, so it
 * carries no colour at all.
 */
const statusConfig = (
  t: (k: string, opts?: Record<string, unknown>) => string,
): Record<UiState, { edge: string; label: string; description: string }> => ({
  active: {
    edge: "border-accent-sage",
    label: t("dashboard.statusActive"),
    description: t("dashboard.statusActiveDesc"),
  },
  grace: {
    edge: "border-accent-yellow",
    label: t("dashboard.statusGrace"),
    description: t("dashboard.statusGraceDesc"),
  },
  claimable: {
    edge: "border-accent-red",
    label: t("dashboard.statusClaimable"),
    description: t("dashboard.statusClaimableDesc"),
  },
  distributed: {
    edge: "border-tile-line",
    label: t("dashboard.statusDistributed"),
    description: t("dashboard.statusDistributedDesc"),
  },
});

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface TickResult {
  state: UiState;
  label: string;
  countdown: CountdownParts;
}

const LABELS = (t: (k: string, opts?: Record<string, unknown>) => string): Record<UiState, string> => ({
  distributed: t("dashboard.labelDistributed"),
  claimable: t("dashboard.labelClaimable"),
  grace: t("dashboard.labelGrace"),
  active: t("dashboard.labelActive"),
});

function computeTick(estate: EstateData, vaultEmpty: boolean, t: (k: string, opts?: Record<string, unknown>) => string): TickResult {
  const { state, secondsUntilGrace, secondsUntilClaimable } = computeEstateState({
    lastHeartbeat: estate.lastHeartbeat,
    heartbeatInterval: estate.heartbeatInterval,
    gracePeriod: estate.gracePeriod,
    pausedUntil: estate.pausedUntil,
    createdAt: estate.createdAt,
    vaultEmpty,
  });

  const remaining =
    state === "active" ? secondsUntilGrace :
    state === "grace" ? secondsUntilClaimable :
    0;

  return {
    state,
    label: LABELS(t)[state],
    countdown: {
      days: Math.floor(remaining / 86400),
      hours: Math.floor((remaining % 86400) / 3600),
      minutes: Math.floor((remaining % 3600) / 60),
      seconds: remaining % 60,
    },
  };
}

function getEstateStripMeta(estate: EstateData, t: (k: string, opts?: Record<string, unknown>) => string) {
  const vaultEmpty =
    estate.claimableAssets === 0 && estate.solBalance === 0 && estate.vaultTokens.length === 0;
  const { state, countdown } = computeTick(estate, vaultEmpty, t);
  const timeLabel =
    state === "active" ? t("dashboard.timeLeft", { days: countdown.days }) :
    state === "grace" ? t("dashboard.graceDays", { days: countdown.days }) :
    state === "claimable" ? t("dashboard.claimable") :
    t("dashboard.distributed");
  const assetCount = 1 + estate.vaultTokens.length;
  return { state, timeLabel, assetCount };
}

/**
 * One estate in the switcher: a hairline chip carrying its label and the one
 * line that matters at a glance — how much is in it, and how long is left.
 */
const EstateChip = ({
  estate,
  selected,
  onClick,
  fullWidth = false,
}: {
  estate: EstateData;
  selected: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}) => {
  const { t } = useTranslation("app");
  const { timeLabel, assetCount } = getEstateStripMeta(estate, t);
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start justify-center gap-1 overflow-hidden rounded-lg border px-3.5 py-2.5 text-left transition-colors",
        fullWidth ? "w-full" : "w-48 shrink-0",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-tile-line bg-background hover:bg-tile-soft",
      )}
    >
      <span className="w-full truncate text-sm font-semibold">{estate.label}</span>
      <span
        className={cn(
          "w-full truncate text-[10px] font-bold uppercase tracking-[0.14em]",
          selected ? "text-background/60" : "text-muted-foreground",
        )}
      >
        {assetCount} {assetCount !== 1 ? t("dashboard.assetsPlural") : t("dashboard.asset")} · {timeLabel}
      </span>
    </button>
  );
};

const EstateCard = ({ estate }: { estate: EstateData }) => {
  const { sendHeartbeatOnChain, depositSolOnChain, depositTokenOnChain, fetchEstates } = useVault();
  const { publicKey, isConnected } = useWallet();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { t } = useTranslation("app");
  const [sendingHeartbeat, setSendingHeartbeat] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [luloTargetMint, setLuloTargetMint] = useState<string | null>(null);
  const [luloDialogOpen, setLuloDialogOpen] = useState(false);
  const [recallDialogOpen, setRecallDialogOpen] = useState(false);
  const [recallTarget, setRecallTarget] = useState<"lulo" | "staking" | null>(null);
  const [activeStrategyType, setActiveStrategyType] = useState<"lulo" | "staking">("lulo");
  const [strategyProgress, setStrategyProgress] = useState<StrategyProgressStep>("idle");
  const [showProgressOverlay, setShowProgressOverlay] = useState(false);

  const [stakingDialogOpen, setStakingDialogOpen] = useState(false);
  const [assetTab, setAssetTab] = useState<"sol" | "tokens">("sol");

  // TEMP: network-aware feature toggle for yield/staking.
  // Mainnet: always show. Devnet/local: only show if VITE_FEATURE_YIELD_STAKING_UI=true.
  // TODO: Remove once feature ships to all networks.
  const cluster = getClusterFromEndpoint();
  const showYieldStaking = cluster === "solana:mainnet" || FEATURE_YIELD_STAKING_UI;

  // Placeholder strategies — per-estate local state (replace with real data later)
  const [luloStrategy, setLuloStrategy] = useState<Strategy | null>(null);
  const [stakingStrategy, setStakingStrategy] = useState<Strategy | null>(null);
  const [topUpOpen, setTopUpOpen] = useState<"sol" | string | null>(null);
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Placeholder notifications state — per-estate local state (replace with real fetch/sign/save later)
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

  const notifSignMessage = `heirlm.xyz wants you to manage notification settings.

Estate:  ${estate.estatePda}
Wallet:  ${publicKey ?? ""}

This does not cost gas and does not authorize any on-chain transaction.`;

  const { data: walletSplTokens } = useWalletSplTokens(topUpOpen !== null && isConnected ? publicKey : null);
  const { sol: walletSolBalance } = useTokenBalances(topUpOpen !== null && isConnected ? publicKey : null);

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
      toast({ title: t("dashboard.toastTopUpFailTitle"), description: errMsg(err), variant: "destructive" });
    } finally {
      setTopUpLoading(false);
    }
  };

  const vaultEmpty = estate.claimableAssets === 0 && estate.solBalance === 0 && estate.vaultTokens.length === 0;
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
  }, [estate, vaultEmpty]);

  const handleHeartbeat = async () => {
    setSendingHeartbeat(true);
    try {
      const tx = await sendHeartbeatOnChain(estate.heir);
      setLastTxId(tx);
      track("heartbeat_succeeded", { source: "dashboard" });
      toast({ title: t("dashboard.toastHeartbeatTitle"), description: t("dashboard.toastHeartbeatDesc") });
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

    setStakingStrategy(makePlaceholderStakingStrategy({ amount: solVaultBalance, validatorName: validatorId }));

    await new Promise((r) => setTimeout(r, 800));
    setShowProgressOverlay(false);
    setStrategyProgress("idle");
    toast({ title: t("dashboard.toastStakingTitle"), description: t("dashboard.toastStakingDesc", { validator: validatorId }) });
  };

  const handleCopyHeir = () => {
    navigator.clipboard.writeText(estate.heir);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const config = statusConfig(t)[computedState];
  const solDisplay = formatSol(estate.solBalance);
  const assetCount = 1 + estate.vaultTokens.length;
  const countdownUnits = [
    { label: t("dashboard.days"), value: countdown.days },
    { label: t("dashboard.hours"), value: countdown.hours },
    { label: t("dashboard.min"), value: countdown.minutes },
    { label: t("dashboard.sec"), value: countdown.seconds },
  ];

  return (
    <div className="app-grid items-start">
      {/* ------------------------------------------------------ the vault itself */}
      <div className="space-y-4 lg:col-span-8 lg:space-y-5">
        {/* State and clock read as one object: what the vault is right now, and
            how long it stays that way. The panel's border carries the state's
            colour so the escalation is visible before a word is read. */}
        <Panel pad={false} className={cn("overflow-hidden", config.edge)}>
          <div className="flex flex-col gap-6 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div className="min-w-0">
              {/* The state is carried by the word below and by the colour of
                  the panel's own edge — the label stays a label. */}
              <span className="tag">{t("dashboard.vaultStatus")}</span>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                {config.label}
              </h2>
              <p className="mt-2 max-w-[48ch] text-sm font-medium leading-relaxed text-muted-foreground">
                {config.description}
              </p>
            </div>

            {computedState !== "distributed" && (
              <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                <Button
                  variant={computedState === "claimable" ? "default" : "sage"}
                  size="xl"
                  onClick={handleHeartbeat}
                  disabled={sendingHeartbeat}
                  className={cn("w-full md:w-auto", computedState === "grace" && "shake-alert")}
                >
                  {sendingHeartbeat ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {t("dashboard.signing")}</>
                  ) : computedState === "claimable" ? (
                    <><Heart className="h-4 w-4" fill="currentColor" /> {t("dashboard.imAlive")}</>
                  ) : (
                    <><Heart className="h-4 w-4" fill="currentColor" /> {t("dashboard.checkIn")}</>
                  )}
                </Button>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("dashboard.restartsTimer")}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-tile-line">
            <div className="flex items-center gap-3 px-5 pt-4 md:px-6">
              <span className="cap">{countdownLabel}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
              {computedState === "grace" && (
                <span className="tag tag-accent animate-pulse-slow">{t("dashboard.urgent")}</span>
              )}
            </div>
            <dl className="grid grid-cols-4">
              {countdownUnits.map((unit, i) => (
                <div
                  key={unit.label}
                  className={cn(
                    "px-3 py-4 md:px-6 md:py-5",
                    i === 0 && "pl-5 md:pl-6",
                    i > 0 && "border-l border-tile-line",
                  )}
                >
                  <dd className="num-xl">{String(unit.value).padStart(2, "0")}</dd>
                  <dt className="cap mt-2">{unit.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </Panel>

        {/* ------------------------------------------------------------- assets */}
        <Panel pad={false}>
          <div className="flex flex-wrap items-center gap-3 border-b border-tile-line px-5 py-4 md:px-6">
            <span className="cap cap-ink">{t("dashboard.assets")}</span>
            <span className="tag">
              {assetCount} {assetCount !== 1 ? t("dashboard.assetsPlural") : t("dashboard.asset")}
            </span>
            <span aria-hidden="true" className="hidden h-px flex-1 bg-tile-line sm:block" />
            <div className="seg ml-auto sm:ml-0">
              <button
                onClick={() => setAssetTab("sol")}
                data-active={assetTab === "sol"}
                className="seg-item"
              >
                {SOL_LABEL}
              </button>
              <button
                onClick={() => setAssetTab("tokens")}
                data-active={assetTab === "tokens"}
                className="seg-item"
              >
                {t("dashboard.tokens")} ({estate.vaultTokens.length})
              </button>
            </div>
          </div>

          <div className="p-5 md:p-6">
            {assetTab === "sol" ? (
              <div>
                <div className="flex flex-wrap items-end justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                      <span className="cap">{SOL_LABEL}</span>
                    </div>
                    <p className="num-xl mt-3">{solDisplay}</p>
                    <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                      {`${estate.solBalance.toLocaleString()} ${t("dashboard.lamports")}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {showYieldStaking && !stakingStrategy?.active && (
                      <Button
                        variant="yellow"
                        size="sm"
                        onClick={handleEnableStaking}
                        disabled={solVaultBalance <= 0}
                      >
                        <Sprout className="h-3.5 w-3.5" /> {t("dashboard.stakeSol")}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTopUpOpen("sol")}
                      disabled={estate.solBalance === 0}
                    >
                      <TrendingUp className="h-3.5 w-3.5" /> {t("dashboard.addMore")}
                    </Button>
                  </div>
                </div>

                {showYieldStaking && stakingStrategy?.active && (
                  <SolStakingIndicator
                    solBalance={solVaultBalance}
                    strategy={stakingStrategy}
                    onEnable={handleEnableStaking}
                    onRecall={handleRecallStaking}
                    loading={showProgressOverlay && recallTarget === "staking" && strategyProgress !== "idle"}
                    progressStep={
                      showProgressOverlay && recallTarget === "staking" ? strategyProgress : "idle"
                    }
                  />
                )}

                {/* SOL Top Up Dialog */}
                <TopUpDialog
                  open={topUpOpen === "sol"}
                  symbol={SOL_LABEL}
                  decimals={SOL_DECIMALS}
                  vaultBalance={solVaultBalance}
                  walletBalance={walletSolBalance}
                  onConfirm={handleTopUp}
                  onCancel={() => setTopUpOpen(null)}
                  loading={topUpLoading}
                />
              </div>
            ) : (
              <div
                className={cn(
                  estate.vaultTokens.length > 6 && "max-h-[420px] overflow-y-auto pr-1",
                )}
              >
                {estate.vaultTokens.length === 0 ? (
                  <p className="py-10 text-center text-sm font-medium text-muted-foreground">
                    {t("dashboard.noTokens")}
                  </p>
                ) : (
                  estate.vaultTokens.map((vt) => {
                    const walletBal = walletSplTokens?.find((t) => t.mint === vt.mint);
                    return (
                      <TokenRow
                        key={vt.ata}
                        vt={vt}
                        meta={tokenMeta.get(vt.mint)}
                        walletBalance={walletBal?.uiAmount ?? 0}
                        showYieldStaking={showYieldStaking}
                        luloStrategy={luloStrategy?.type === "lulo" ? luloStrategy : null}
                        onEnableYield={() => {
                          setLuloTargetMint(vt.mint);
                          setActiveStrategyType("lulo");
                          setLuloDialogOpen(true);
                        }}
                        onRecallYield={handleRecallLulo}
                        yieldLoading={showProgressOverlay && recallTarget === "lulo" && luloTargetMint === vt.mint && strategyProgress !== "idle"}
                        yieldProgressStep={
                          showProgressOverlay && recallTarget === "lulo" && luloTargetMint === vt.mint
                            ? strategyProgress
                            : "idle"
                        }
                        topUpOpen={topUpOpen === vt.mint}
                        onTopUpOpen={() => setTopUpOpen(vt.mint)}
                        onTopUpCancel={() => setTopUpOpen(null)}
                        onTopUpConfirm={handleTopUp}
                        topUpLoading={topUpLoading}
                      />
                    );
                  })
                )}
              </div>
            )}
          </div>
        </Panel>

        {lastTxId && (
          <a
            href={getSolanaExplorerTxUrl(lastTxId)}
            target="_blank"
            rel="noopener noreferrer"
            className="panel panel-hover flex items-center gap-2.5 px-5 py-3.5 text-sm font-semibold md:px-6"
          >
            <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={2} />
            {t("dashboard.viewLatestTx")}
          </a>
        )}
      </div>

      {/* ----------------------------------------------------------- the rail
          Everything that describes or changes the vault, rather than being it:
          who it goes to, what it tells you, and the levers that alter it. */}
      <div className="space-y-4 lg:col-span-4 lg:space-y-5">
        <Panel>
          <p className="cap cap-ink">{t("dashboard.heirDetails")}</p>
          <button
            onClick={handleCopyHeir}
            title={t("dashboard.copyHeirAddress")}
            className="mt-4 flex w-full items-start justify-between gap-3 rounded-lg border border-tile-line px-4 py-3 text-left transition-colors hover:bg-tile-soft"
          >
            <span className="min-w-0">
              <span className="cap block">{t("dashboard.heir")}</span>
              <span className="mt-1.5 block truncate text-sm font-semibold">{estate.label}</span>
              <span className="mt-0.5 block break-all font-mono text-[11px] text-muted-foreground">
                {estate.heir}
              </span>
            </span>
            {copied ? (
              <Check className="h-4 w-4 shrink-0" strokeWidth={2} />
            ) : (
              <Copy className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
            )}
          </button>

          <div className="mt-4">
            <div className="data-row flex-col items-start">
              <span className="data-k">
                {t("dashboard.guardian")}
                {estate.delegate && estate.isDeferred ? ` (${t("dashboard.pauseUsed")})` : ""}
              </span>
              <span className="break-all font-mono text-[11px] font-medium">
                {estate.delegate || t("common.notSet")}
              </span>
            </div>
            <div className="data-row flex-col items-start">
              <span className="data-k">{t("dashboard.heartbeatSigner")}</span>
              <span className="break-all font-mono text-[11px] font-medium">
                {estate.hbSigner || t("common.notSet")}
              </span>
            </div>
          </div>
        </Panel>

        {/* Notifications — separate from Manage Estate: off-chain preference, not a vault mutation.
            Gated behind FEATURE_NOTIFICATIONS_UI: no backend (fetch/sign/save) wired up yet. */}
        {FEATURE_NOTIFICATIONS_UI && (
          <>
            <NotificationsCard status={notifStatus} summary={notifSummary} onAction={handleNotifAction} />

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

        {computedState !== "distributed" && (
          <Panel>
            <p className="cap cap-ink">{t("dashboard.manageEstate")}</p>

            <div className="mt-5 space-y-5">
              <div>
                <p className="cap">{t("dashboard.heirTiming")}</p>
                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <ReassignHeirSection estate={estate} onTx={setLastTxId} />
                  <EditSettingsSection estate={estate} onTx={setLastTxId} />
                </div>
              </div>

              <div>
                <p className="cap">{t("dashboard.assets")}</p>
                <div className="mt-2.5">
                  <AddAssetSection estate={estate} onTx={setLastTxId} />
                </div>
              </div>

              <div>
                <p className="cap">{t("dashboard.dangerZone")}</p>
                <div className="mt-2.5">
                  <EmergencyWithdrawSection estate={estate} onTx={setLastTxId} />
                </div>
              </div>
            </div>
          </Panel>
        )}
      </div>

      {/* Lulo enable dialog */}
      {showYieldStaking && activeLuloHolding && (
        <LuloEnableDialog
          open={luloDialogOpen}
          tokenSymbol={luloSymbol || "tokens"}
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

      {/* Staking enable dialog */}
      {showYieldStaking && (
        <StakingEnableDialog
          open={stakingDialogOpen}
          solBalance={solVaultBalance}
          onConfirm={handleConfirmStaking}
          onCancel={() => setStakingDialogOpen(false)}
          loading={showProgressOverlay}
        />
      )}

      {/* Recall confirmation dialog */}
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

      {/* Progress overlay for two-step flows */}
      {showYieldStaking && (
        <StrategyProgressOverlay
          open={showProgressOverlay}
          strategyType={activeStrategyType}
          step={strategyProgress}
        />
      )}
    </div>
  );
};


const DashboardPage = () => {
  const { isConnected, disconnectWallet } = useWallet();
  const { estates, loading, pendingCreate, pendingTxId, clearVault } = useVault();
  const navigate = useNavigate();
  const { t } = useTranslation("app");
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherQuery, setSwitcherQuery] = useState("");
  const selectedEstate = estates[selectedIndex] ?? estates[0];
  const filteredSwitcherEstates = estates
    .map((estate, index) => ({ estate, index }))
    .filter(({ estate }) => estate.label.toLowerCase().includes(switcherQuery.trim().toLowerCase()));

  // Visible strip always includes the selected estate, even if it's outside the capped range —
  // the first CAP-1 slots stay stable, the last slot swaps to the current selection when needed.
  const stripEntries =
    selectedIndex >= ESTATE_STRIP_CAP
      ? [
          ...estates.slice(0, ESTATE_STRIP_CAP - 1).map((estate, index) => ({ estate, index })),
          { estate: estates[selectedIndex], index: selectedIndex },
        ]
      : estates.slice(0, ESTATE_STRIP_CAP).map((estate, index) => ({ estate, index }));

  const handleDisconnect = () => {
    clearVault();
    disconnectWallet();
    navigate("/");
  };

  if (loading && estates.length === 0 && !pendingCreate) {
    return (
      <AppFrame head={<PageHead label={t("dashboard.title")} backTo="/" backLabel={t("common.home")} />}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="rise-in text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" strokeWidth={2} />
            <h2 className="ed-h3 mt-6">{t("dashboard.loadingVault")}</h2>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              {t("dashboard.fetchingData")}
            </p>
          </div>
        </div>
      </AppFrame>
    );
  }

  return (
    <>
      <AppFrame
        head={
          <PageHead
            label={t("dashboard.title")}
            backTo="/"
            backLabel={t("common.home")}
            right={
              <>
                {isConnected ? (
                  <Button variant="ghost" size="sm" onClick={handleDisconnect} className="hidden sm:inline-flex">
                    {t("common.disconnect")}
                  </Button>
                ) : null}
                <Button variant="yellow" size="sm" onClick={() => navigate("/create-vault")}>
                  <Plus className="h-3.5 w-3.5" /> {t("dashboard.newEstate")}
                </Button>
              </>
            }
          />
        }
      >
        <div className="rise-in space-y-6">
          {/* The page opens on its own headline, the way a landing section does:
              what you are looking at, and how much of it there is. With nothing
              to count, the empty state below carries the page instead. */}
          {estates.length > 0 && (
            <h1 className="ed-h2">
              {t("dashboard.yourEstates")}{" "}
              <span className="text-muted-foreground tabular-nums">({estates.length})</span>
            </h1>
          )}

          {pendingCreate && (
            <Panel tone="soft" className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={2} />
              <p className="text-sm font-medium">{t("dashboard.pendingCreate")}</p>
              {pendingTxId && (
                <a
                  href={getSolanaExplorerTxUrl(pendingTxId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] underline-offset-4 hover:underline"
                >
                  {t("common.viewOnExplorer")} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </Panel>
          )}

          {estates.length === 0 && !pendingCreate && (
            /* Nothing to lay out yet, so the screen is composed rather than
               filled: the mark, the ask, and the two ways forward, centred. */
            <div className="py-10 text-center md:py-16" data-tour="dashboard-actions">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-xl border border-tile-line bg-tile-soft md:h-32 md:w-32">
                <VaultMark className="h-11 w-11 text-foreground/25 md:h-12 md:w-12" />
              </div>

              <h2 className="ed-h2 mt-8">
                {isConnected ? t("dashboard.noVaultYet") : t("dashboard.connectWallet")}
              </h2>
              <p className="ed-lede mx-auto mt-4 max-w-[46ch] text-muted-foreground">
                {isConnected ? t("dashboard.noVaultDesc") : t("dashboard.connectDesc")}
              </p>

              <div className="mt-8 flex flex-col items-center gap-4">
                {isConnected ? (
                  <Button variant="flat" size="lg" onClick={() => navigate("/create-vault")}>
                    {t("dashboard.createYourVault")}
                  </Button>
                ) : (
                  <Button variant="flat" size="lg" onClick={() => setWalletDialogOpen(true)}>
                    <Wallet className="h-4 w-4" /> {t("dashboard.connectWallet")}
                  </Button>
                )}
                {/* A sentence, so it is set as one: a link, not a control
                    shouting in tracked capitals. */}
                <button
                  onClick={() => navigate("/claim")}
                  className="text-sm font-semibold underline underline-offset-4 transition-colors hover:text-muted-foreground"
                >
                  {t("dashboard.namedAsHeir")}
                </button>
              </div>
            </div>
          )}

          {estates.length > 1 && (
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
              {stripEntries.map(({ estate: e, index: i }) => (
                <EstateChip
                  key={e.estatePda}
                  estate={e}
                  selected={i === selectedIndex}
                  onClick={() => setSelectedIndex(i)}
                />
              ))}
              {estates.length > ESTATE_STRIP_CAP && (
                <button
                  onClick={() => setSwitcherOpen(true)}
                  aria-label={`${t("dashboard.viewAllEstates")} (${estates.length})`}
                  className="flex w-40 shrink-0 flex-col items-start justify-center gap-1 rounded-lg border border-dashed border-tile-line px-3.5 py-2.5 text-left transition-colors hover:border-foreground hover:bg-tile-soft"
                >
                  <span className="text-sm font-semibold">
                    +{estates.length - ESTATE_STRIP_CAP} {t("dashboard.more")}
                  </span>
                  <span className="cap truncate">{t("dashboard.viewAllEstates")}</span>
                </button>
              )}
            </div>
          )}

          {selectedEstate && (
            <div data-tour="dashboard-estate">
              <EstateCard estate={selectedEstate} />
            </div>
          )}
        </div>
      </AppFrame>

      <Sheet
        open={switcherOpen}
        size="lg"
        title={t("dashboard.allEstates")}
        caption={t("dashboard.totalClickToSwitch", { count: estates.length })}
        onClose={() => {
          setSwitcherOpen(false);
          setSwitcherQuery("");
        }}
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <input
            type="text"
            value={switcherQuery}
            onChange={(e) => setSwitcherQuery(e.target.value)}
            placeholder={t("dashboard.searchEstates")}
            aria-label={t("dashboard.searchEstatesAria")}
            autoFocus
            className="field pl-10"
          />
        </div>
        <div className="mt-4 grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {filteredSwitcherEstates.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm font-medium text-muted-foreground">
              {t("dashboard.noMatch")} &ldquo;{switcherQuery}&rdquo;.
            </p>
          ) : (
            filteredSwitcherEstates.map(({ estate: e, index: i }) => (
              <EstateChip
                key={e.estatePda}
                estate={e}
                selected={i === selectedIndex}
                fullWidth
                onClick={() => {
                  setSelectedIndex(i);
                  setSwitcherOpen(false);
                  setSwitcherQuery("");
                }}
              />
            ))
          )}
        </div>
      </Sheet>

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

export default DashboardPage;
