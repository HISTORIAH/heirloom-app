import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Loader2, Plus, Search, Wallet } from "lucide-react";
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
import { getEstateStripMeta } from "@/components/dashboard/estateState";
import VaultMark from "@/components/landing/VaultMark";
import { useWallet } from "@/contexts/WalletContext";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { cn, getSolanaExplorerTxUrl } from "@/lib/utils";
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
      onClick={onClick}
      className={cn(
        "flex min-h-[54px] flex-col items-start justify-center gap-0.5 overflow-hidden rounded-lg border px-3.5 py-2 text-left transition-colors",
        fullWidth ? "w-full" : "w-44 shrink-0",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-tile-line bg-background hover:bg-tile-soft",
      )}
    >
      <span className="flex w-full min-w-0 items-center gap-2 text-sm font-semibold">
        <span className="truncate">{estate.label}</span>
      </span>
      <span
        className={cn(
          "w-full truncate text-[10px] font-bold uppercase tracking-[0.12em]",
          selected ? "text-background/60" : "text-muted-foreground",
        )}
      >
        {assetCount} {assetCount !== 1 ? t("dashboard.assetsPlural") : t("dashboard.asset")} ·{" "}
        {timeLabel}
      </span>
    </button>
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
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-xl border border-tile-line bg-background p-8 text-center">
          <Loader2 className="mx-auto mb-5 h-9 w-9 animate-spin" strokeWidth={2} />
          <h2 className="ed-h3">{t("dashboard.loadingVault")}</h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {t("dashboard.fetchingData")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
      <PageHeader
        title={t("dashboard.title")}
        onDisconnect={handleDisconnect}
        onConnectWallet={() => setWalletDialogOpen(true)}
        hideConnect={estates.length === 0 && !pendingCreate}
      />

      {/* The running head, borrowed from the landing spread: the page is
          announced at the margin and the rule carries out to the right edge. */}
      <div className="flex h-[3.75rem] items-center gap-[clamp(0.75rem,1.4vw,1.5rem)] border-b border-tile-line px-[var(--page-pad)]">
        <span className="text-[11px] font-bold uppercase leading-none tracking-[0.18em]">
          {t("dashboard.yourEstates")}
        </span>
        <span className="font-display text-[13px] font-bold leading-none tabular-nums">
          {String(estates.length).padStart(2, "0")}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
        <Button variant="flat-yellow" size="sm" onClick={() => navigate("/create-vault")}>
          <Plus className="h-4 w-4" /> {t("dashboard.newEstate")}
        </Button>
      </div>

      {estates.length === 0 && !pendingCreate ? (
        <div
          className="flex flex-1 flex-col items-center justify-center px-[var(--page-pad)] py-[clamp(1.5rem,6vh,7rem)]"
          data-tour="dashboard-actions"
        >
          <div className="mx-auto max-w-xl text-center">
            <VaultMark className="mark-lg mx-auto text-tile-line" />
            {isConnected && (
              <h2 className="ed-h2 mt-8">{t("dashboard.noVaultYet")}</h2>
            )}
            <p
              className={
                isConnected
                  ? "ed-lede mx-auto mt-6 max-w-[42ch] text-muted-foreground"
                  : "ed-lede mx-auto mt-8 max-w-[42ch] text-muted-foreground"
              }
            >
              {isConnected ? t("dashboard.noVaultDesc") : t("dashboard.connectDesc")}
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              {isConnected ? (
                <Button variant="flat-yellow" size="lg" onClick={() => navigate("/create-vault")}>
                  {t("dashboard.createYourVault")}
                </Button>
              ) : (
                <Button
                  variant="flat-yellow"
                  size="lg"
                  onClick={() => setWalletDialogOpen(true)}
                >
                  <Wallet className="h-5 w-5" /> {t("dashboard.connectWallet")}
                </Button>
              )}
              <button
                onClick={() => navigate("/claim")}
                className="text-sm font-semibold underline underline-offset-4 transition-colors hover:text-muted-foreground"
              >
                {t("dashboard.namedAsHeir")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-[clamp(1.25rem,2.4vh,2rem)] px-[var(--page-pad)] py-[clamp(1.5rem,6vh,7rem)]">
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
          {estates.length > 1 && (
            <div className="flex flex-nowrap items-center gap-2 overflow-hidden">
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
                  aria-label={`${t("dashboard.viewAllEstates")} (${estates.length})`}
                  className="flex min-h-[54px] w-44 shrink-0 flex-col items-start justify-center gap-0.5 rounded-lg border border-dashed border-tile-line px-3.5 py-2 text-left transition-colors hover:bg-tile-soft"
                >
                  <span className="text-sm font-semibold">
                    +{estates.length - ESTATE_STRIP_CAP} {t("dashboard.more")}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {t("dashboard.viewAllEstates")}
                  </span>
                </button>
              )}
            </div>
          )}

          {selectedEstate && (
            <div data-tour="dashboard-estate">
              <EstateCard key={selectedEstate.estatePda} estate={selectedEstate} />
            </div>
          )}
        </div>
      )}

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
