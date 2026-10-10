import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, Loader2, Plus, RotateCw, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { EstateCard } from "@/components/dashboard/EstateCard";
import { EstateRename } from "@/components/dashboard/EstateRename";
import { ConnectPrompt } from "@/components/dashboard/ConnectPrompt";
import { DashboardSkeleton, RunningHeadSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { getEstateStripMeta } from "@/components/dashboard/estateState";
import { Panel } from "@/components/surface/Panel";
import VaultMark from "@/components/VaultMark";
import { useWallet } from "@/contexts/WalletContext";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { ESTATE_FETCH_TIMEOUT_MS } from "@/lib/constants";
import { cn, getSolanaExplorerTxUrl, truncateAddress } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

const ESTATE_STRIP_CAP = 5;

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
  const { t } = useTranslation("app");
  const { timeLabel, assetCount } = getEstateStripMeta(estate, t);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-[58px] flex-col items-start justify-center gap-1 overflow-hidden rounded-xl border px-4 py-2.5 text-left transition-colors",
        fullWidth ? "w-full" : "w-[11.5rem] shrink-0",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-tile-line bg-background hover:bg-tile-soft",
      )}
    >
      <span className={cn("w-full truncate text-sm font-bold", !estate.label && "font-mono")}>
        {estate.label ?? truncateAddress(estate.heir, 4)}
      </span>
      <span
        className={cn(
          "w-full truncate text-[10px] font-semibold uppercase tracking-[0.12em]",
          selected ? "text-background/70" : "text-muted-foreground",
        )}
      >
        {assetCount} {assetCount !== 1 ? t("dashboard.assetsPlural") : t("dashboard.asset")} ·{" "}
        {timeLabel}
      </span>
    </button>
  );
};

/** Shown in place of the skeleton when the first fetch fails or takes too long. */
const EstateLoadError = ({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) => {
  const { t } = useTranslation("app");
  return (
    <Panel bare className="mx-auto max-w-lg items-center gap-4 rounded-2xl p-8 text-center">
      <h2 className="text-xl font-bold">{t("dashboard.loadErrorTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("dashboard.loadErrorDesc")}</p>
      <Button
        variant="flat"
        size="sm"
        onClick={onRetry}
        disabled={retrying}
        className="h-11 px-5 tracking-[0.12em]"
      >
        {retrying ? <Loader2 className="animate-spin" /> : <RotateCw />} {t("dashboard.retry")}
      </Button>
    </Panel>
  );
};

const DashboardPage = () => {
  const { isConnected, disconnectWallet, account } = useWallet();
  const {
    estates,
    loading,
    hasLoaded,
    error,
    fetchEstates,
    pendingCreate,
    pendingTxId,
    clearVault,
  } = useVault();
  const navigate = useNavigate();
  const { t } = useTranslation("app");
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherQuery, setSwitcherQuery] = useState("");
  const [timedOut, setTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const selectedEstate = estates[selectedIndex] ?? estates[0];
  const filteredSwitcherEstates = estates
    .map((estate, index) => ({ estate, index }))
    .filter(({ estate }) =>
      (estate.label ?? truncateAddress(estate.heir, 4))
        .toLowerCase()
        .includes(switcherQuery.trim().toLowerCase()),
    );

  // Visible strip always includes the selected estate, even if it's outside the capped range —
  // the first CAP-1 slots stay stable, the last slot swaps to the current selection when needed.
  const stripEntries =
    selectedIndex >= ESTATE_STRIP_CAP
      ? [
          ...estates.slice(0, ESTATE_STRIP_CAP - 1).map((estate, index) => ({ estate, index })),
          { estate: estates[selectedIndex], index: selectedIndex },
        ]
      : estates.slice(0, ESTATE_STRIP_CAP).map((estate, index) => ({ estate, index }));

  // The skeleton never waits forever: past the timeout it gives way to Retry.
  const waitingForFirstLoad = isConnected && !hasLoaded && !pendingCreate;
  useEffect(() => {
    if (!waitingForFirstLoad) return;
    const timer = setTimeout(() => setTimedOut(true), ESTATE_FETCH_TIMEOUT_MS);
    return () => {
      clearTimeout(timer);
      setTimedOut(false);
    };
  }, [waitingForFirstLoad, retryCount]);

  const handleRetry = () => {
    setRetryCount((n) => n + 1);
    void fetchEstates();
  };

  const handleDisconnect = () => {
    clearVault();
    disconnectWallet();
    navigate("/");
  };

  const loadFailed =
    (waitingForFirstLoad && timedOut) || (!!error && estates.length === 0 && !pendingCreate);
  const hasEstates = estates.length > 0 || pendingCreate;

  // The running head: the estate count, the open estate's name, and a rule out to New estate.
  const runningHead = (
    <div className="flex h-[3.75rem] items-center gap-[clamp(0.75rem,1.4vw,1.5rem)] border-b border-tile-line px-[var(--page-pad)]">
      <span className="text-[11px] font-bold uppercase leading-none tracking-[0.18em]">
        {t("dashboard.yourEstates")}
      </span>
      <span className="font-display text-[13px] font-bold leading-none tabular-nums">
        {String(estates.length).padStart(2, "0")}
      </span>
      {selectedEstate && account && (
        <>
          <span aria-hidden="true" className="h-4 w-px bg-tile-line" />
          <EstateRename key={selectedEstate.estatePda} estate={selectedEstate} account={account} />
        </>
      )}
      <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
      {/* Outline, so Check In stays the page's only yellow call to action. */}
      <Button
        variant="flat-outline"
        size="sm"
        onClick={() => navigate("/create-vault")}
        className="shrink-0 border tracking-[0.12em]"
      >
        <Plus className="h-4 w-4" /> {t("dashboard.newEstate")}
      </Button>
    </div>
  );

  const estateTabs = estates.length > 1 && (
    <div
      role="group"
      aria-label={t("dashboard.yourEstates")}
      className="flex min-w-0 flex-wrap items-center gap-2"
    >
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
          type="button"
          onClick={() => setSwitcherOpen(true)}
          aria-label={`${t("dashboard.viewAllEstates")} (${estates.length})`}
          className="flex min-h-[58px] w-[11.5rem] shrink-0 flex-col items-start justify-center gap-1 rounded-xl border border-dashed border-tile-line px-4 py-2.5 text-left transition-colors hover:bg-tile-soft"
        >
          <span className="text-sm font-bold">
            +{estates.length - ESTATE_STRIP_CAP} {t("dashboard.more")}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t("dashboard.viewAllEstates")}
          </span>
        </button>
      )}
    </div>
  );

  const renderBody = () => {
    if (!isConnected) return <ConnectPrompt onConnect={() => setWalletDialogOpen(true)} />;

    if (loadFailed) {
      return (
        <main className="flex flex-1 items-center px-[var(--page-pad)] py-16">
          <EstateLoadError retrying={loading} onRetry={handleRetry} />
        </main>
      );
    }

    if (waitingForFirstLoad) {
      return (
        <>
          <RunningHeadSkeleton />
          <main className="px-[var(--page-pad)] pb-16 pt-8">
            <DashboardSkeleton />
          </main>
        </>
      );
    }

    if (!hasEstates) {
      return (
        <main
          className="flex flex-1 flex-col items-center justify-center px-[var(--page-pad)] py-[clamp(1.5rem,6vh,7rem)] text-center"
          data-tour="dashboard-actions"
        >
          <VaultMark className="h-24 w-24 text-tile-line" />
          <h1 className="ed-h2 mt-8">{t("dashboard.noVaultYet")}</h1>
          <p className="ed-lede mx-auto mt-6 max-w-[42ch] text-muted-foreground">
            {t("dashboard.noVaultDesc")}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="flat-yellow"
              onClick={() => navigate("/create-vault")}
              className="h-14 rounded-xl px-7 text-sm tracking-[0.1em]"
            >
              {t("dashboard.createYourVault")}
            </Button>
            <Button
              variant="flat-outline"
              asChild
              className="h-14 rounded-xl border px-6 text-sm tracking-[0.1em]"
            >
              <Link to="/inherit">{t("dashboard.namedAnHeir")}</Link>
            </Button>
          </div>
        </main>
      );
    }

    return (
      <>
        {runningHead}
        <main className="space-y-5 px-[var(--page-pad)] pb-16 pt-8">
          {pendingCreate && (
            <div className="rounded-xl border border-accent-yellow bg-accent-yellow px-5 py-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm font-semibold">{t("dashboard.pendingCreate")}</p>
              </div>
              {pendingTxId && (
                <a
                  href={getSolanaExplorerTxUrl(pendingTxId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-xs font-semibold underline underline-offset-4"
                >
                  {t("common.viewOnExplorer")} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {estateTabs}

          {selectedEstate && (
            <div data-tour="dashboard-estate">
              <EstateCard key={selectedEstate.estatePda} estate={selectedEstate} />
            </div>
          )}
        </main>
      </>
    );
  };

  return (
    <div className="flex flex-1 flex-col overflow-x-clip bg-background">
      <PageHeader
        onDisconnect={handleDisconnect}
        onConnectWallet={() => setWalletDialogOpen(true)}
      />

      {renderBody()}

      <Dialog
        open={switcherOpen}
        onOpenChange={(open) => {
          setSwitcherOpen(open);
          if (!open) setSwitcherQuery("");
        }}
      >
        <DialogContent className="max-w-lg rounded-xl border-tile-line p-6 sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="ed-h3">{t("dashboard.allEstates")}</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground">
              {t("dashboard.totalClickToSwitch", { count: estates.length })}
            </DialogDescription>
          </DialogHeader>
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
              className="ed-input h-11 pl-10 pr-4"
            />
          </div>
          <div className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto pr-1">
            {filteredSwitcherEstates.length === 0 ? (
              <p className="col-span-2 py-8 text-center text-sm font-medium text-muted-foreground">
                {t("dashboard.noMatch")} &ldquo;{switcherQuery}&rdquo;.
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
