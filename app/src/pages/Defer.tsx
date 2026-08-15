import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SOL_LABEL } from "@/lib/constants";
import { getSolanaExplorerTxUrl } from "@/lib/utils";
import { delegateDefer } from "@/services/heirloom";
import type { HeirloomClient } from "@/lib/heirloom";
import {
  lookupEstateSnapshot,
  type EstateSnapshot,
} from "@/services/heirloom";
import { formatDuration, formatSol, errMsg } from "@/lib/utils";
import {
  address as toAddress,
  type Address,
  type TransactionSigner,
} from "@solana/kit";
import {
  ArrowLeft, Search, Loader2, CheckCircle, ExternalLink,
  AlertTriangle, Coins, Shield, Clock, LogOut, Wallet,
} from "lucide-react";
import { WithWallet } from "@/components/WithWallet";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useTranslation } from "@heirloom/i18n";

const stateColors: Record<string, string> = {
  active: "bg-accent-lime/20",
  grace: "bg-accent-yellow/20",
  claimable: "bg-accent-red/20",
  distributed: "bg-secondary",
};

const DeferPageInner: React.FC<{
  signer: TransactionSigner | null;
  delegateAddress: Address | null;
}> = ({ signer, delegateAddress }) => {
  const { isConnected, rpc, rpcSubscriptions, disconnectWallet } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { t } = useTranslation("app");

  const client: HeirloomClient = { rpc, rpcSubscriptions };

  const [authorityInput, setAuthorityInput] = useState("");
  const [heirInput, setHeirInput] = useState("");
  const [looking, setLooking] = useState(false);
  const [estate, setEstate] = useState<EstateSnapshot | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [deferring, setDeferring] = useState(false);
  const [deferTxId, setDeferTxId] = useState<string | null>(null);
  const [deferConfirmOpen, setDeferConfirmOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);

  const handleLookup = async () => {
    const a = authorityInput.trim();
    const h = heirInput.trim();
    if (!a || !h) return;
    setLooking(true);
    setLookupError(null);
    setEstate(null);
    setDeferTxId(null);
    const result = await lookupEstateSnapshot(client, a, h);
    if (!result) {
      setLookupError(t("defer.notFoundError"));
    } else if (!result.delegate) {
      setLookupError(t("defer.noDelegateError"));
      setEstate(result);
    } else if (delegateAddress && result.delegate !== delegateAddress.toString()) {
      setLookupError(
        t("defer.wrongDelegateError", { delegate: result.delegate.slice(0, 8) }),
      );
      setEstate(result);
    } else {
      setEstate(result);
    }
    setLooking(false);
  };

  const requestDefer = () => {
    if (!estate) return;
    if (!signer) {
      setWalletDialogOpen(true);
      return;
    }
    if (estate.isDeferred) {
      toast({
        title: t("defer.toastAlreadyTitle"),
        description: t("defer.toastAlreadyDesc"),
        variant: "destructive",
      });
      return;
    }
    setDeferConfirmOpen(true);
  };

  const performDefer = async () => {
    if (!estate || !signer) return;
    setDeferring(true);
    try {
      const tx = await delegateDefer(client, signer, {
        authority: toAddress(estate.authority),
        heir: toAddress(estate.heir),
      });
      setDeferTxId(tx);
      setDeferConfirmOpen(false);
      track("defer_succeeded");
      toast({ title: t("defer.toastDeferTitle"), description: t("defer.toastDeferDesc") });
      const updated = await lookupEstateSnapshot(client, estate.authority, estate.heir);
      if (updated) setEstate(updated);
    } catch (err: unknown) {
      track("defer_failed", { stage: "transaction" });
      toast({
        title: t("defer.toastFailTitle"),
        description: errMsg(err, t("defer.rejected")),
        variant: "destructive",
      });
    } finally {
      setDeferring(false);
    }
  };

  const canDefer =
    estate !== null &&
    delegateAddress !== null &&
    estate.delegate === delegateAddress.toString() &&
    !estate.isDeferred &&
    estate.vaultState !== "distributed";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-8 border-foreground bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-20">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-lg font-semibold hover:underline group">
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" strokeWidth={3} />
            {t("common.home")}
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" strokeWidth={3} />
            <span className="text-2xl font-bold">{t("defer.title")}</span>
          </div>
          {isConnected ? (
            <button
              onClick={() => void disconnectWallet()}
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:underline"
            >
              <LogOut className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">{t("common.disconnect")}</span>
            </button>
          ) : (
            <button
              onClick={() => setWalletDialogOpen(true)}
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:underline"
            >
              <Wallet className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">{t("common.connectWallet")}</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 neo-slide-up">
            <div>
              <span className="neo-badge bg-accent-purple mb-4 inline-block text-white">{t("defer.guardianPortal")}</span>
              <h2 className="text-4xl md:text-5xl leading-[0.9]">
                {t("defer.headline1")}{" "}
                <span className="bg-accent-purple text-white px-2 inline-block rotate-[-1deg]">{t("defer.headline2")}</span>
              </h2>
              <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
                {t("defer.description")}
              </p>
            </div>

            <div className="neo-card-static space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
                  {t("defer.authorityLabel")}
                </label>
                <input
                  type="text"
                  value={authorityInput}
                  onChange={(e) => setAuthorityInput(e.target.value)}
                  maxLength={128}
                  className="neo-input w-full font-mono text-sm focus:bg-accent-purple/10"
                  placeholder={t("defer.authorityPlaceholder")}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
                  {t("defer.heirLabel")}
                </label>
                <input
                  type="text"
                  value={heirInput}
                  onChange={(e) => setHeirInput(e.target.value)}
                  maxLength={128}
                  className="neo-input w-full font-mono text-sm focus:bg-accent-purple/10"
                  placeholder={t("defer.heirPlaceholder")}
                />
              </div>
              <Button
                variant="default"
                size="lg"
                onClick={handleLookup}
                disabled={looking || !authorityInput.trim() || !heirInput.trim()}
                className="w-full"
              >
                {looking ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> {t("defer.lookingUp")}</>
                ) : (
                  <><Search className="h-5 w-5" /> {t("defer.lookUpEstate")}</>
                )}
              </Button>
              {lookupError && (
                <div className="flex items-center gap-2 text-sm font-bold text-accent-red">
                  <AlertTriangle className="h-4 w-4" />
                  {lookupError}
                </div>
              )}
            </div>

            {estate && (
              <div className="neo-card-static space-y-5">
                <div className={`neo-border rounded-xl p-5 ${stateColors[estate.vaultState]}`}>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {t("defer.label")}
                      </p>
                      <p className="text-2xl font-bold truncate">{estate.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {t("defer.state")}
                      </p>
                      <p className="text-2xl font-bold uppercase">{estate.vaultState}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="neo-border rounded-lg p-3 bg-secondary">
                    <p className="text-xs font-bold text-muted-foreground uppercase">{SOL_LABEL}</p>
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4" />
                      <p className="text-lg font-bold">
                        {formatSol(estate.solBalance)}
                      </p>
                    </div>
                  </div>
                  <div className="neo-border rounded-lg p-3 bg-secondary">
                    <p className="text-xs font-bold text-muted-foreground uppercase">{t("defer.pauseDuration")}</p>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <p className="text-lg font-bold">{formatDuration(estate.pauseDuration)}</p>
                    </div>
                  </div>
                  <div className="neo-border rounded-lg p-3 bg-secondary">
                    <p className="text-xs font-bold text-muted-foreground uppercase">{t("defer.pauseUsed")}</p>
                    <p className="text-lg font-bold">{estate.isDeferred ? t("common.yes") : t("common.no")}</p>
                  </div>
                </div>

                <div className="neo-border rounded-lg p-3 bg-accent-purple/10">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t("defer.delegate")}
                  </p>
                  <p className="font-mono text-xs break-all">
                    {estate.delegate ?? t("common.none")}
                  </p>
                </div>

                <div className="pt-3 border-t-2 border-foreground/10">
                  {deferTxId ? (
                    <div className="text-center">
                      <CheckCircle className="h-10 w-10 mx-auto mb-2" strokeWidth={2.5} />
                      <p className="font-bold mb-2">{t("defer.deferSubmitted")}</p>
                      <a
                        href={getSolanaExplorerTxUrl(deferTxId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 neo-badge bg-background hover:bg-secondary transition-colors"
                      >
                        {t("common.viewOnExplorer")} <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ) : !isConnected ? (
                    <Button
                      variant="yellow"
                      size="xl"
                      className="w-full"
                      onClick={() => setWalletDialogOpen(true)}
                    >
                      <Shield className="h-5 w-5" /> {t("defer.connectToDefer")}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="xl"
                      className="w-full"
                      onClick={requestDefer}
                      disabled={!canDefer || deferring}
                    >
                      {deferring ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> {t("defer.deferring")}</>
                      ) : estate.isDeferred ? (
                        <><CheckCircle className="h-5 w-5" /> {t("defer.alreadyDeferred")}</>
                      ) : estate.vaultState === "distributed" ? (
                        <>{t("defer.vaultDistributed")}</>
                      ) : estate.delegate !== delegateAddress?.toString() ? (
                        <>{t("defer.notDelegate")}</>
                      ) : (
                        <><Shield className="h-5 w-5" /> {t("defer.deferClaimWindow")}</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
      </div>

      <ConfirmDialog
        open={deferConfirmOpen}
        title={t("defer.confirmTitle")}
        description={
          estate
            ? t("defer.confirmDesc", { duration: formatDuration(estate.pauseDuration) })
            : undefined
        }
        confirmLabel={t("defer.confirmLabel")}
        cancelLabel={t("defer.cancelLabel")}
        variant="default"
        loading={deferring}
        icon={<Shield className="h-6 w-6" strokeWidth={2.5} />}
        accent="bg-accent-purple/20"
        onConfirm={performDefer}
        onCancel={() => {
          if (!deferring) setDeferConfirmOpen(false);
        }}
      />

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </div>
  );
};

const DeferPage = () => (
  <WithWallet>
    {(ctx) => (
      <DeferPageInner signer={ctx?.signer ?? null} delegateAddress={ctx?.address ?? null} />
    )}
  </WithWallet>
);

export default DeferPage;
