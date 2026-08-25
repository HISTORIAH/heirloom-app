import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
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
import { Search, Loader2, Check, ExternalLink, AlertTriangle, Shield } from "lucide-react";
import AppFrame, { PageHead } from "@/components/app/AppFrame";
import PortalLead from "@/components/app/PortalLead";
import { Panel, StatCell } from "@/components/app/Panel";
import StateTag from "@/components/app/StateTag";
import { WithWallet } from "@/components/WithWallet";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useTranslation } from "@heirloom/i18n";

const DeferPageInner: React.FC<{
  signer: TransactionSigner | null;
  delegateAddress: Address | null;
}> = ({ signer, delegateAddress }) => {
  const { isConnected, rpc, rpcSubscriptions } = useWallet();
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
    <>
      <AppFrame
        measure="narrow"
        head={
          <PageHead
            label={t("defer.title")}
            backTo="/"
            backLabel={t("common.home")}
            right={<span className="tag">{t("defer.guardianPortal")}</span>}
          />
        }
      >
        <div className="rise-in">
          <PortalLead
            headline={
              <>
                {t("defer.headline1")}{" "}
                <span className="bg-accent-yellow px-2">{t("defer.headline2")}</span>
              </>
            }
            lede={t("defer.description")}
          />

          <Panel className="mt-9">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="cap mb-2 block">{t("defer.authorityLabel")}</label>
                <input
                  type="text"
                  value={authorityInput}
                  onChange={(e) => setAuthorityInput(e.target.value)}
                  maxLength={128}
                  className="field field-mono"
                  placeholder={t("defer.authorityPlaceholder")}
                />
              </div>
              <div>
                <label className="cap mb-2 block">{t("defer.heirLabel")}</label>
                <input
                  type="text"
                  value={heirInput}
                  onChange={(e) => setHeirInput(e.target.value)}
                  maxLength={128}
                  className="field field-mono"
                  placeholder={t("defer.heirPlaceholder")}
                />
              </div>
            </div>

            <Button
              variant="default"
              className="mt-5 w-full sm:w-auto"
              onClick={handleLookup}
              disabled={looking || !authorityInput.trim() || !heirInput.trim()}
            >
              {looking ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {t("defer.lookingUp")}</>
              ) : (
                <><Search className="h-4 w-4" /> {t("defer.lookUpEstate")}</>
              )}
            </Button>

            {lookupError && (
              <p className="mt-4 flex items-start gap-2 text-sm font-semibold text-accent-red">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                {lookupError}
              </p>
            )}
          </Panel>

          {estate && (
            <Panel pad={false} className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tile-line px-5 py-4 md:px-6">
                <div className="min-w-0">
                  <p className="cap">{t("defer.label")}</p>
                  <p className="mt-1.5 truncate font-display text-xl font-semibold tracking-[-0.02em]">
                    {estate.label}
                  </p>
                </div>
                <div className="text-right">
                  <p className="cap">{t("defer.state")}</p>
                  <StateTag state={estate.vaultState} className="mt-1.5" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3">
                <div className="px-5 py-5 md:px-6">
                  <StatCell label={SOL_LABEL} value={formatSol(estate.solBalance)} />
                </div>
                <div className="border-t border-tile-line px-5 py-5 sm:border-l sm:border-t-0 md:px-6">
                  <StatCell
                    label={t("defer.pauseDuration")}
                    value={formatDuration(estate.pauseDuration)}
                  />
                </div>
                <div className="border-t border-tile-line px-5 py-5 sm:border-l sm:border-t-0 md:px-6">
                  <StatCell
                    label={t("defer.pauseUsed")}
                    value={estate.isDeferred ? t("common.yes") : t("common.no")}
                  />
                </div>
              </div>

              <div className="border-t border-tile-line px-5 py-4 md:px-6">
                <p className="cap">{t("defer.delegate")}</p>
                <p className="mt-1.5 break-all font-mono text-xs">
                  {estate.delegate ?? t("common.none")}
                </p>
              </div>

              <div className="border-t border-tile-line px-5 py-5 md:px-6">
                {deferTxId ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="tag tag-live">
                      <Check className="h-3 w-3" strokeWidth={2.5} /> {t("defer.deferSubmitted")}
                    </span>
                    <a
                      href={getSolanaExplorerTxUrl(deferTxId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] underline-offset-4 hover:underline"
                    >
                      {t("common.viewOnExplorer")} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : !isConnected ? (
                  <Button
                    variant="yellow"
                    size="xl"
                    className="w-full"
                    onClick={() => setWalletDialogOpen(true)}
                  >
                    <Shield className="h-4 w-4" /> {t("defer.connectToDefer")}
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
                      <><Loader2 className="h-4 w-4 animate-spin" /> {t("defer.deferring")}</>
                    ) : estate.isDeferred ? (
                      <><Check className="h-4 w-4" /> {t("defer.alreadyDeferred")}</>
                    ) : estate.vaultState === "distributed" ? (
                      <>{t("defer.vaultDistributed")}</>
                    ) : estate.delegate !== delegateAddress?.toString() ? (
                      <>{t("defer.notDelegate")}</>
                    ) : (
                      <><Shield className="h-4 w-4" /> {t("defer.deferClaimWindow")}</>
                    )}
                  </Button>
                )}
              </div>
            </Panel>
          )}
        </div>
      </AppFrame>

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
        icon={<Shield strokeWidth={2} />}
        onConfirm={performDefer}
        onCancel={() => {
          if (!deferring) setDeferConfirmOpen(false);
        }}
      />

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
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
