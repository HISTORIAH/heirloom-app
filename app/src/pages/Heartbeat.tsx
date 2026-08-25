import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { SOL_LABEL } from "@/lib/constants";
import { updateFields } from "@/services/heirloom";
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
import { useTranslation } from "@heirloom/i18n";
import { Panel } from "@/components/surface/Panel";
import { PortalLayout } from "@/components/portal/PortalLayout";
import {
  EstateGlance,
  ExplorerLink,
  GlanceRow,
  GlanceStats,
} from "@/components/portal/EstateGlance";

const HeartbeatPageInner: React.FC<{
  signer: TransactionSigner | null;
  walletAddress: Address | null;
}> = ({ signer, walletAddress }) => {
  const { isConnected, rpc, rpcSubscriptions } = useWallet();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { t, i18n } = useTranslation("app");

  const client: HeirloomClient = { rpc, rpcSubscriptions };

  const [authorityInput, setAuthorityInput] = useState("");
  const [heirInput, setHeirInput] = useState("");
  const [looking, setLooking] = useState(false);
  const [estate, setEstate] = useState<EstateSnapshot | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [hbTxId, setHbTxId] = useState<string | null>(null);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);

  const handleLookup = async () => {
    const a = authorityInput.trim();
    const h = heirInput.trim();
    if (!a || !h) return;
    setLooking(true);
    setLookupError(null);
    setEstate(null);
    setHbTxId(null);
    const result = await lookupEstateSnapshot(client, a, h);
    if (!result) {
      setLookupError(t("heartbeat.notFoundError"));
    } else if (!result.hbSigner) {
      setLookupError(t("heartbeat.noSignerError"));
      setEstate(result);
    } else if (walletAddress && result.hbSigner !== walletAddress.toString()) {
      setLookupError(
        t("heartbeat.wrongSignerError", { signer: result.hbSigner.slice(0, 8) }),
      );
      setEstate(result);
    } else {
      setEstate(result);
    }
    setLooking(false);
  };

  const handleSendHeartbeat = async () => {
    if (!estate) return;
    if (!signer) {
      setWalletDialogOpen(true);
      return;
    }
    setSigning(true);
    try {
      const tx = await updateFields(client, signer, {
        authorityAddress: toAddress(estate.authority),
        heir: toAddress(estate.heir),
      });
      setHbTxId(tx);
      track("heartbeat_succeeded", { source: "heartbeat_signer_page" });
      toast({ title: t("heartbeat.toastSentTitle"), description: t("heartbeat.toastSentDesc") });
      const updated = await lookupEstateSnapshot(client, estate.authority, estate.heir);
      if (updated) setEstate(updated);
    } catch (err: unknown) {
      track("heartbeat_failed", { source: "heartbeat_signer_page" });
      toast({
        title: t("heartbeat.toastFailTitle"),
        description: errMsg(err, t("heartbeat.rejected")),
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  const canSign =
    estate !== null &&
    walletAddress !== null &&
    estate.hbSigner === walletAddress.toString() &&
    estate.vaultState !== "distributed";

  return (
    <>
      <PortalLayout
        title={t("heartbeat.title")}
        cap={t("heartbeat.hotSignerPortal")}
        headline={
          <>
            {t("heartbeat.headline1")} {t("heartbeat.headline2")}
          </>
        }
        description={t("heartbeat.description")}
        onConnectWallet={() => setWalletDialogOpen(true)}
      >
        <div data-tour="heartbeat-lookup">
        <Panel className="gap-4">
          <div>
            <label className="ed-field-label" htmlFor="hb-authority">
              {t("heartbeat.authorityLabel")}
            </label>
            <input
              id="hb-authority"
              type="text"
              value={authorityInput}
              onChange={(e) => setAuthorityInput(e.target.value)}
              maxLength={128}
              spellCheck={false}
              autoComplete="off"
              className="ed-input mt-2 font-mono"
              placeholder={t("heartbeat.authorityPlaceholder")}
            />
          </div>
          <div>
            <label className="ed-field-label" htmlFor="hb-heir">
              {t("heartbeat.heirLabel")}
            </label>
            <input
              id="hb-heir"
              type="text"
              value={heirInput}
              onChange={(e) => setHeirInput(e.target.value)}
              maxLength={128}
              spellCheck={false}
              autoComplete="off"
              className="ed-input mt-2 font-mono"
              placeholder={t("heartbeat.heirPlaceholder")}
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
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("heartbeat.lookingUp")}</>
            ) : (
              <><Search className="h-4 w-4" /> {t("heartbeat.lookUpEstate")}</>
            )}
          </Button>
          {lookupError && (
            <p className="flex items-center gap-2 text-sm font-semibold text-accent-red">
              <AlertTriangle className="h-4 w-4" />
              {lookupError}
            </p>
          )}
        </Panel>
        </div>

        {estate && (
          <EstateGlance label={estate.label} state={estate.vaultState}>
            <GlanceStats>
              <GlanceRow label={SOL_LABEL} value={formatSol(estate.solBalance)} />
              <GlanceRow label={t("heartbeat.interval")} value={formatDuration(estate.heartbeatInterval)} />
              <GlanceRow
                label={t("heartbeat.lastHeartbeat")}
                value={
                  estate.lastHeartbeat > 0
                    ? new Date(estate.lastHeartbeat * 1000).toLocaleString(i18n.language)
                    : t("common.na")
                }
              />
              <GlanceRow
                label={t("heartbeat.heartbeatSigner")}
                value={estate.hbSigner ?? t("common.none")}
                mono
              />
            </GlanceStats>

            <div className="mt-5 border-t border-tile-line pt-5">
              {hbTxId ? (
                <div className="text-center">
                  <CheckCircle className="mx-auto mb-2 h-6 w-6" strokeWidth={2} />
                  <p className="font-semibold">{t("heartbeat.heartbeatSent")}</p>
                  <div className="mt-2">
                    <ExplorerLink txId={hbTxId}>{t("common.viewOnExplorer")}</ExplorerLink>
                  </div>
                </div>
              ) : !isConnected ? (
                <Button
                  variant="flat-yellow"
                  size="lg"
                  className="w-full"
                  onClick={() => setWalletDialogOpen(true)}
                >
                  {t("heartbeat.connectToSign")}
                </Button>
              ) : (
                <Button
                  variant="flat"
                  size="lg"
                  className="w-full"
                  onClick={handleSendHeartbeat}
                  disabled={!canSign || signing}
                >
                  {signing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {t("heartbeat.signing")}</>
                  ) : estate.vaultState === "distributed" ? (
                    t("heartbeat.vaultDistributed")
                  ) : estate.hbSigner !== walletAddress?.toString() ? (
                    t("heartbeat.notSigner")
                  ) : (
                    t("heartbeat.sendHeartbeat")
                  )}
                </Button>
              )}
            </div>
          </EstateGlance>
        )}
      </PortalLayout>

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

const HeartbeatPage = () => (
  <WithWallet>
    {(ctx) => (
      <HeartbeatPageInner signer={ctx?.signer ?? null} walletAddress={ctx?.address ?? null} />
    )}
  </WithWallet>
);

export default HeartbeatPage;
