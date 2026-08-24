import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { SOL_LABEL } from "@/lib/constants";
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
import { Search, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { WithWallet } from "@/components/WithWallet";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useTranslation } from "@heirloom/i18n";
import { Panel } from "@/components/surface/Panel";
import { PortalLayout } from "@/components/portal/PortalLayout";
import {
  EstateGlance,
  ExplorerLink,
  GlanceRow,
  GlanceStats,
} from "@/components/portal/EstateGlance";

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
      <PortalLayout
        title={t("defer.title")}
        cap={t("defer.guardianPortal")}
        accent="bg-accent-purple"
        headline={
          <>
            {t("defer.headline1")} {t("defer.headline2")}
          </>
        }
        description={t("defer.description")}
        onConnectWallet={() => setWalletDialogOpen(true)}
      >
        <Panel className="gap-4">
          <div>
            <label className="ed-label" htmlFor="defer-authority">
              {t("defer.authorityLabel")}
            </label>
            <input
              id="defer-authority"
              type="text"
              value={authorityInput}
              onChange={(e) => setAuthorityInput(e.target.value)}
              maxLength={128}
              spellCheck={false}
              autoComplete="off"
              className="ed-input mt-2 font-mono"
              placeholder={t("defer.authorityPlaceholder")}
            />
          </div>
          <div>
            <label className="ed-label" htmlFor="defer-heir">
              {t("defer.heirLabel")}
            </label>
            <input
              id="defer-heir"
              type="text"
              value={heirInput}
              onChange={(e) => setHeirInput(e.target.value)}
              maxLength={128}
              spellCheck={false}
              autoComplete="off"
              className="ed-input mt-2 font-mono"
              placeholder={t("defer.heirPlaceholder")}
            />
          </div>
          <Button
            variant="flat"
            size="lg"
            onClick={handleLookup}
            disabled={looking || !authorityInput.trim() || !heirInput.trim()}
            className="w-full"
          >
            {looking ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("defer.lookingUp")}</>
            ) : (
              <><Search className="h-4 w-4" /> {t("defer.lookUpEstate")}</>
            )}
          </Button>
          {lookupError && (
            <p className="flex items-center gap-2 text-sm font-semibold text-accent-red">
              <AlertTriangle className="h-4 w-4" />
              {lookupError}
            </p>
          )}
        </Panel>

        {estate && (
          <EstateGlance label={estate.label} state={estate.vaultState}>
            <GlanceStats>
              <GlanceRow label={SOL_LABEL} value={formatSol(estate.solBalance)} />
              <GlanceRow
                label={t("defer.pauseDuration")}
                value={formatDuration(estate.pauseDuration)}
              />
              <GlanceRow
                label={t("defer.pauseUsed")}
                value={estate.isDeferred ? t("common.yes") : t("common.no")}
              />
              <GlanceRow
                label={t("defer.delegate")}
                value={estate.delegate ?? t("common.none")}
                mono
              />
            </GlanceStats>

            <div className="mt-5 border-t border-tile-line pt-5">
              {deferTxId ? (
                <div className="text-center">
                  <CheckCircle className="mx-auto mb-2 h-6 w-6" strokeWidth={2} />
                  <p className="font-semibold">{t("defer.deferSubmitted")}</p>
                  <div className="mt-2">
                    <ExplorerLink txId={deferTxId}>{t("common.viewOnExplorer")}</ExplorerLink>
                  </div>
                </div>
              ) : !isConnected ? (
                <Button
                  variant="flat-yellow"
                  size="lg"
                  className="w-full"
                  onClick={() => setWalletDialogOpen(true)}
                >
                  {t("defer.connectToDefer")}
                </Button>
              ) : (
                <Button
                  variant="flat"
                  size="lg"
                  className="w-full"
                  onClick={requestDefer}
                  disabled={!canDefer || deferring}
                >
                  {deferring ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {t("defer.deferring")}</>
                  ) : estate.isDeferred ? (
                    t("defer.alreadyDeferred")
                  ) : estate.vaultState === "distributed" ? (
                    t("defer.vaultDistributed")
                  ) : estate.delegate !== delegateAddress?.toString() ? (
                    t("defer.notDelegate")
                  ) : (
                    t("defer.deferClaimWindow")
                  )}
                </Button>
              )}
            </div>
          </EstateGlance>
        )}
      </PortalLayout>

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
        cap={t("defer.title")}
        accent="bg-accent-purple"
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
