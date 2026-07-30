import PageHeader from "@/components/PageHeader";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Heart,
  Users,
  Coins,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Plus,
  TrendingUp,
  Wallet,
  ChevronDown,
  Sprout,
  Search,
} from "lucide-react";

const ESTATE_STRIP_CAP = 5;

type UiState = "active" | "grace" | "claimable" | "distributed";

const statusConfig: Record<UiState, { bg: string; label: string; description: string }> = {
  active: {
    bg: "neo-section-lime",
    label: "Active",
    description: "Heartbeat timer is running. All good.",
  },
  grace: {
    bg: "bg-accent-yellow",
    label: "Grace Period",
    description: "Heartbeat missed. Send one before the grace period expires!",
  },
  claimable: {
    bg: "bg-accent-red",
    label: "Claimable",
    description: "Grace period expired. Heirs can now claim their shares.",
  },
  distributed: {
    bg: "bg-secondary",
    label: "Distributed",
    description: "All assets have been distributed to heirs.",
  },
};

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

const LABELS: Record<UiState, string> = {
  distributed: "Vault Distributed",
  claimable: "Vault Is Claimable",
  grace: "Time Until Claimable",
  active: "Next Check-In Due In",
};

function computeTick(estate: EstateData, vaultEmpty: boolean): TickResult {
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
    label: LABELS[state],
    countdown: {
      days: Math.floor(remaining / 86400),
      hours: Math.floor((remaining % 86400) / 3600),
      minutes: Math.floor((remaining % 3600) / 60),
      seconds: remaining % 60,
    },
  };
}

const STRIP_DOT_COLOR: Record<UiState, string> = {
  active: "bg-accent-lime",
  grace: "bg-accent-yellow",
  claimable: "bg-accent-red",
  distributed: "bg-secondary",
};

function getEstateStripMeta(estate: EstateData) {
  const vaultEmpty =
    estate.claimableAssets === 0 && estate.solBalance === 0 && estate.vaultTokens.length === 0;
  const { state, countdown } = computeTick(estate, vaultEmpty);
  const timeLabel =
    state === "active" ? `${countdown.days}d left` :
    state === "grace" ? `Grace · ${countdown.days}d` :
    state === "claimable" ? "Claimable" :
    "Distributed";
  const assetCount = 1 + estate.vaultTokens.length;
  return { state, dotColor: STRIP_DOT_COLOR[state], timeLabel, assetCount };
}

const EstatePillButton = ({
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
  const { dotColor, timeLabel, assetCount } = getEstateStripMeta(estate);
  return (
    <button
      onClick={onClick}
      className={cn(
        "neo-border rounded-xl px-3 py-2 min-h-[56px] flex flex-col items-start justify-center gap-0.5 transition-colors text-left overflow-hidden",
        fullWidth ? "w-full" : "w-44 shrink-0",
        selected ? "bg-accent-yellow" : "bg-background hover:bg-secondary",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold w-full min-w-0">
        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", dotColor)} />
        <span className="truncate">{estate.label}</span>
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate w-full">
        {assetCount} asset{assetCount !== 1 ? "s" : ""} · {timeLabel}
      </span>
    </button>
  );
};

const EstateCard = ({ estate }: { estate: EstateData }) => {
  const { sendHeartbeatOnChain, depositSolOnChain, depositTokenOnChain, fetchEstates } = useVault();
  const { publicKey, isConnected } = useWallet();
  const { toast } = useToast();
  const { track } = useAnalytics();
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
      setNotifSummary(summarizeNotifications(next, estate.label));
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
      toast({ title: "Top-up sent", description: "Funds added to the vault." });
      await fetchEstates();
    } catch (err: unknown) {
      track("vault_top_up_failed", { asset_type: topUpOpen === "sol" ? "sol" : "token" });
      toast({ title: "Top-up failed", description: errMsg(err), variant: "destructive" });
    } finally {
      setTopUpLoading(false);
    }
  };

  const vaultEmpty = estate.claimableAssets === 0 && estate.solBalance === 0 && estate.vaultTokens.length === 0;
  const vaultMints = estate.vaultTokens.map((vt) => vt.mint);
  const { metadata: tokenMeta } = useTokenMetadata(vaultMints);
  const initial = computeTick(estate, vaultEmpty);
  const [countdown, setCountdown] = useState<CountdownParts>(initial.countdown);
  const [computedState, setComputedState] = useState<UiState>(initial.state);
  const [countdownLabel, setCountdownLabel] = useState(initial.label);

  useEffect(() => {
    const tick = () => {
      const r = computeTick(estate, vaultEmpty);
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
      toast({ title: "Heartbeat Sent!", description: "Your vault timer has been reset." });
    } catch (err: unknown) {
      track("heartbeat_failed", { source: "dashboard" });
      toast({
        title: "Heartbeat Failed",
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
    toast({ title: "Lulo yield enabled", description: "Funds are now earning yield." });
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
    toast({ title: "Funds recalled", description: "Assets returned to your vault." });
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
    toast({ title: "Staking enabled", description: `SOL delegated to ${validatorId}.` });
  };

  const handleCopyHeir = () => {
    navigator.clipboard.writeText(estate.heir);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const config = statusConfig[computedState];
  const solDisplay = formatSol(estate.solBalance);
  const tokenIcon = <Coins className="h-6 w-6" strokeWidth={2.5} />;

  return (
    <div className="space-y-8">
      {/* Status banner */}
      <div className={`${config.bg} neo-border-thick rounded-2xl p-8 neo-shadow-xl`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="min-w-0">
            <span className="neo-badge bg-background mb-3 inline-block">Vault Status</span>
            <h2 className="text-4xl md:text-5xl uppercase font-display">{config.label}</h2>
            <p className="text-sm font-medium text-foreground/60 mt-1">{config.description}</p>
          </div>
          {computedState !== "distributed" && (
            <div className="flex flex-col items-center gap-2 shrink-0">
              <Button
                variant={computedState === "claimable" ? "pill-dark" : "pill"}
                size="xl"
                onClick={handleHeartbeat}
                disabled={sendingHeartbeat}
                className={computedState === "grace" ? "neo-shake" : ""}
              >
                {sendingHeartbeat ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Signing...</>
                ) : computedState === "claimable" ? (
                  <><Heart className="h-5 w-5" fill="currentColor" /> I'm Alive — Reclaim</>
                ) : (
                  <><Heart className="h-5 w-5" fill="currentColor" /> Check In</>
                )}
              </Button>
              {computedState === "claimable" && !sendingHeartbeat && (
                <p className="text-xs font-medium text-foreground/60">Restarts your 60-day timer</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Last tx link */}
      {lastTxId && (
        <div className="neo-card-static bg-accent-cyan/10 !p-5">
          <a
            href={getSolanaExplorerTxUrl(lastTxId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-semibold hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View latest transaction on Explorer
          </a>
        </div>
      )}

      {/* Countdown */}
      <div className="neo-card-static">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl">{countdownLabel}</h3>
        </div>
        <div className="grid grid-cols-4 gap-3 md:gap-4">
          {[
            { label: "Days", value: countdown.days },
            { label: "Hours", value: countdown.hours },
            { label: "Min", value: countdown.minutes },
            { label: "Sec", value: countdown.seconds },
          ].map((unit) => (
            <div key={unit.label} className="text-center">
              <div className="neo-border rounded-xl bg-secondary p-4 md:p-6">
                <span
                  className={cn(
                    "text-4xl md:text-6xl font-bold tabular-nums font-display",
                    unit.label === "Sec" && "text-accent-lime",
                  )}
                >
                  {String(unit.value).padStart(2, "0")}
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-2">
                {unit.label}
              </p>
            </div>
          ))}
        </div>
        {computedState === "grace" && (
          <div className="flex justify-end mt-4 pt-4 border-t-2 border-foreground/10">
            <span className="neo-badge bg-accent-yellow text-xs animate-pulse-slow">Urgent</span>
          </div>
        )}
      </div>

      {/* Assets — tabs for SOL / Tokens */}
      <div className="neo-card-static">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl">Assets</h3>
          <span className="neo-badge bg-secondary !px-3 !py-0.5 !text-xs">
            {1 + estate.vaultTokens.length} asset{1 + estate.vaultTokens.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setAssetTab("sol")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold uppercase neo-border transition-colors",
              assetTab === "sol" ? "bg-accent-yellow" : "bg-secondary hover:bg-secondary/70",
            )}
          >
            {SOL_LABEL}
          </button>
          <button
            onClick={() => setAssetTab("tokens")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold uppercase neo-border transition-colors",
              assetTab === "tokens" ? "bg-accent-yellow" : "bg-secondary hover:bg-secondary/70",
            )}
          >
            Tokens ({estate.vaultTokens.length})
          </button>
        </div>

        {assetTab === "sol" ? (
          <div className="neo-card-static" style={{ boxShadow: "none" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent-orange neo-border rounded-xl p-3">
                {tokenIcon}
              </div>
              <div>
                <p className="font-bold text-lg">{SOL_LABEL}</p>
                <p className="text-xs font-medium text-muted-foreground">
                  {`${estate.solBalance.toLocaleString()} lamports`}
                </p>
              </div>
            </div>
            <p className="text-4xl font-bold tabular-nums mb-4">{solDisplay}</p>
            <div className={cn("grid gap-2", showYieldStaking && !stakingStrategy?.active ? "grid-cols-2" : "grid-cols-1")}>
              <button
                onClick={handleEnableStaking}
                disabled={solVaultBalance <= 0}
                className="rounded-lg h-10 text-sm font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-1 disabled:opacity-40 border-4 border-foreground bg-accent-yellow hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))]"
              >
                <Sprout className="h-3.5 w-3.5" /> Stake SOL
              </button>
              <button
                onClick={() => setTopUpOpen("sol")}
                disabled={estate.solBalance === 0}
                className="rounded-lg h-10 text-sm font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-1 disabled:opacity-40 border-4 border-foreground bg-transparent hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))]"
              >
                <TrendingUp className="h-3.5 w-3.5" /> Add More
              </button>
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
              "space-y-4",
              estate.vaultTokens.length > 6 && "max-h-[420px] overflow-y-auto pr-1",
            )}
          >
            {estate.vaultTokens.length === 0 ? (
              <p className="text-sm font-medium text-muted-foreground text-center py-8">
                No tokens in this vault yet.
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

      {/* Heir & Details — collapsible */}
      <div className="neo-card-static">
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none gap-3 flex-wrap rounded-lg -m-2 p-2 transition-colors hover:bg-secondary">
            <div className="flex items-center gap-3">
              <div className="bg-accent-yellow neo-border rounded-xl p-2">
                <Users className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl">Heir & Details</h3>
            </div>
            <div className="flex items-center gap-2">
              <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180 shrink-0" strokeWidth={2.5} />
            </div>
          </summary>
          <div className="mt-4 space-y-3 pt-4 border-foreground/10">
            <button
              onClick={handleCopyHeir}
              className="w-full neo-border rounded-lg p-3 bg-secondary hover:bg-secondary/70 transition-colors flex items-center justify-between gap-3 text-left"
              title="Copy heir address"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Heir</p>
                <p className="font-bold">{estate.label}</p>
                <p className="text-xs font-mono text-muted-foreground break-all">{estate.heir}</p>
              </div>
              {copied ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
            </button>

            <div className="neo-border rounded-lg p-3 bg-accent-purple/10">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Guardian{estate.delegate && estate.isDeferred ? " (Pause Used)" : ""}
              </p>
              <p className="font-mono text-xs break-all">{estate.delegate || "Not set"}</p>
            </div>

            <div className="neo-border rounded-lg p-3 bg-accent-pink/10">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Heartbeat Signer</p>
              <p className="font-mono text-xs break-all">{estate.hbSigner || "Not set"}</p>
            </div>
          </div>
        </details>
      </div>

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

      {/* Manage Estate — grouped actions */}
      {computedState !== "distributed" && (
        <div className="neo-card-static bg-secondary/30">
          <h3 className="text-xl mb-6">Manage Estate</h3>

          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Heir & Timing</p>
            <div className="grid grid-cols-2 gap-2">
              <ReassignHeirSection estate={estate} onTx={setLastTxId} />
              <EditSettingsSection estate={estate} onTx={setLastTxId} />
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Assets</p>
            <div className="grid grid-cols-1 gap-2">
              <AddAssetSection estate={estate} onTx={setLastTxId} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Danger Zone</p>
            <EmergencyWithdrawSection estate={estate} onTx={setLastTxId} />
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardPage = () => {
  const { isConnected, disconnectWallet } = useWallet();
  const { estates, loading, pendingCreate, pendingTxId, clearVault } = useVault();
  const navigate = useNavigate();
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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="neo-card-static text-center max-w-md neo-slide-up">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" strokeWidth={2.5} />
          <h2 className="text-2xl mb-3">Loading Vault...</h2>
          <p className="text-muted-foreground font-medium">Fetching on-chain data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Vault Dashboard"
        onDisconnect={handleDisconnect}
        onConnectWallet={() => setWalletDialogOpen(true)}
      />

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-10 neo-slide-up">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-[44px] tracking-tight font-display">
            Your estates <span className="text-muted-foreground">({estates.length})</span>
          </h1>
          <Button variant="yellow" size="lg" onClick={() => navigate("/create-vault")}>
            <Plus className="h-5 w-5" /> New Estate
          </Button>
        </div>

        {pendingCreate && (
          <div className="neo-card-static bg-accent-yellow/20">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="font-medium">Estate creation pending — waiting for on-chain confirmation...</p>
            </div>
            {pendingTxId && (
              <a
                href={getSolanaExplorerTxUrl(pendingTxId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-accent-cyan hover:underline flex items-center gap-1 mt-2"
              >
                View on Explorer <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {estates.length === 0 && !pendingCreate && (
          <div className="text-center py-16" data-tour="dashboard-actions">
            {/* Big illustration */}
            <div className="relative inline-block mb-8">
              <div className="w-32 h-32 rounded-3xl neo-border bg-secondary flex items-center justify-center" style={{ boxShadow: "8px 8px 0 0 hsl(var(--foreground))" }}>
                <svg className="w-16 h-16 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-16L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 rounded-xl bg-accent-pink neo-border flex items-center justify-center" style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}>
                <span className="text-lg">✦</span>
              </div>
            </div>
            <h2 className="font-display text-3xl md:text-4xl mb-3">
              {isConnected ? "No vault yet" : "Connect wallet"}
            </h2>
            <p className="text-muted-foreground font-medium mb-8 max-w-sm mx-auto">
              {isConnected
                ? "Create your first estate to protect your assets for the future."
                : "Connect your wallet to view your estates and manage your vaults."}
            </p>
            <div className="flex flex-col items-center gap-3">
              {isConnected ? (
                <Button variant="yellow" size="lg" onClick={() => navigate("/create-vault")}>
                  Create Your Vault
                </Button>
              ) : (
                <Button variant="yellow" size="lg" onClick={() => setWalletDialogOpen(true)}>
                  <Wallet className="h-5 w-5" /> Connect Wallet
                </Button>
              )}
              <button
                onClick={() => navigate("/claim")}
                className="text-sm font-semibold underline underline-offset-4 hover:text-accent-pink transition-colors"
              >
                Were you named as an heir? Claim inheritance
              </button>
            </div>
          </div>
        )}

        {estates.length > 1 && (
          <div className="flex items-center gap-2 flex-nowrap overflow-hidden">
            {stripEntries.map(({ estate: e, index: i }) => (
              <EstatePillButton
                key={e.estatePda}
                estate={e}
                selected={i === selectedIndex}
                onClick={() => setSelectedIndex(i)}
              />
            ))}
            {estates.length > ESTATE_STRIP_CAP && (
              <button
                onClick={() => setSwitcherOpen(true)}
                aria-label={`View all ${estates.length} estates`}
                className="neo-border border-dashed rounded-xl px-3 py-2 w-44 shrink-0 min-h-[56px] flex flex-col items-start justify-center gap-0.5 bg-accent-purple/10 text-left transition-colors hover:bg-accent-purple/20"
              >
                <span className="text-sm font-semibold">+{estates.length - ESTATE_STRIP_CAP} more</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  View all estates
                </span>
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

      <Dialog
        open={switcherOpen}
        onOpenChange={(open) => {
          setSwitcherOpen(open);
          if (!open) setSwitcherQuery("");
        }}
      >
        <DialogContent className="neo-card-static max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">All Estates</DialogTitle>
            <DialogDescription className="font-medium">
              {estates.length} total · click one to switch
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              strokeWidth={2.5}
            />
            <input
              type="text"
              value={switcherQuery}
              onChange={(e) => setSwitcherQuery(e.target.value)}
              placeholder="Search estates…"
              aria-label="Search estates"
              autoFocus
              className="neo-input pl-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
            {filteredSwitcherEstates.length === 0 ? (
              <p className="col-span-2 text-sm font-medium text-muted-foreground text-center py-8">
                No estates match &ldquo;{switcherQuery}&rdquo;.
              </p>
            ) : (
              filteredSwitcherEstates.map(({ estate: e, index: i }) => (
                <EstatePillButton
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
        </DialogContent>
      </Dialog>

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </div>
  );
};

export default DashboardPage;
