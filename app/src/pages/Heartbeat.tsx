import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { SOL_LABEL } from "@/lib/constants";
import { getSolanaExplorerTxUrl } from "@/lib/utils";
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
import {
  Search,
  Loader2,
  Check,
  ExternalLink,
  AlertTriangle,
  Heart,
} from "lucide-react";
import AppFrame, { PageHead } from "@/components/app/AppFrame";
import PortalLead from "@/components/app/PortalLead";
import { Panel, StatCell } from "@/components/app/Panel";
import StateTag from "@/components/app/StateTag";
import { WithWallet } from "@/components/WithWallet";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useTranslation } from "@heirloom/i18n";

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
      <AppFrame
        measure="narrow"
        head={
          <PageHead
            label={t("heartbeat.title")}
            backTo="/"
            backLabel={t("common.home")}
            right={<span className="tag">{t("heartbeat.hotSignerPortal")}</span>}
          />
        }
      >
        <div className="rise-in">
          <PortalLead
            headline={
              <>
                {t("heartbeat.headline1")}{" "}
                <span className="bg-accent-yellow px-2">{t("heartbeat.headline2")}</span>
              </>
            }
            lede={t("heartbeat.description")}
          />

          <Panel className="mt-9" data-tour="heartbeat-lookup">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="cap mb-2 block">{t("heartbeat.authorityLabel")}</label>
                <input
                  type="text"
                  value={authorityInput}
                  onChange={(e) => setAuthorityInput(e.target.value)}
                  maxLength={128}
                  className="field field-mono"
                  placeholder={t("heartbeat.authorityPlaceholder")}
                />
              </div>
              <div>
                <label className="cap mb-2 block">{t("heartbeat.heirLabel")}</label>
                <input
                  type="text"
                  value={heirInput}
                  onChange={(e) => setHeirInput(e.target.value)}
                  maxLength={128}
                  className="field field-mono"
                  placeholder={t("heartbeat.heirPlaceholder")}
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
                <><Loader2 className="h-4 w-4 animate-spin" /> {t("heartbeat.lookingUp")}</>
              ) : (
                <><Search className="h-4 w-4" /> {t("heartbeat.lookUpEstate")}</>
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
                  <p className="cap">{t("heartbeat.label")}</p>
                  <p className="mt-1.5 truncate font-display text-xl font-semibold tracking-[-0.02em]">
                    {estate.label}
                  </p>
                </div>
                <div className="text-right">
                  <p className="cap">{t("heartbeat.state")}</p>
                  <StateTag state={estate.vaultState} className="mt-1.5" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3">
                <div className="px-5 py-5 md:px-6">
                  <StatCell label={SOL_LABEL} value={formatSol(estate.solBalance)} />
                </div>
                <div className="border-t border-tile-line px-5 py-5 sm:border-l sm:border-t-0 md:px-6">
                  <StatCell
                    label={t("heartbeat.interval")}
                    value={formatDuration(estate.heartbeatInterval)}
                  />
                </div>
                <div className="border-t border-tile-line px-5 py-5 sm:border-l sm:border-t-0 md:px-6">
                  <StatCell
                    label={t("heartbeat.lastHeartbeat")}
                    value={
                      <span className="text-base">
                        {estate.lastHeartbeat > 0
                          ? new Date(estate.lastHeartbeat * 1000).toLocaleString(i18n.language)
                          : t("common.na")}
                      </span>
                    }
                  />
                </div>
              </div>

              <div className="border-t border-tile-line px-5 py-4 md:px-6">
                <p className="cap">{t("heartbeat.heartbeatSigner")}</p>
                <p className="mt-1.5 break-all font-mono text-xs">
                  {estate.hbSigner ?? t("common.none")}
                </p>
              </div>

              <div className="border-t border-tile-line px-5 py-5 md:px-6">
                {hbTxId ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="tag tag-live">
                      <Check className="h-3 w-3" strokeWidth={2.5} /> {t("heartbeat.heartbeatSent")}
                    </span>
                    <a
                      href={getSolanaExplorerTxUrl(hbTxId)}
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
                    <Heart className="h-4 w-4" fill="currentColor" /> {t("heartbeat.connectToSign")}
                  </Button>
                ) : (
                  <Button
                    variant="sage"
                    size="xl"
                    className="w-full"
                    onClick={handleSendHeartbeat}
                    disabled={!canSign || signing}
                  >
                    {signing ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> {t("heartbeat.signing")}</>
                    ) : estate.vaultState === "distributed" ? (
                      <>{t("heartbeat.vaultDistributed")}</>
                    ) : estate.hbSigner !== walletAddress?.toString() ? (
                      <>{t("heartbeat.notSigner")}</>
                    ) : (
                      <><Heart className="h-4 w-4" fill="currentColor" /> {t("heartbeat.sendHeartbeat")}</>
                    )}
                  </Button>
                )}
              </div>
            </Panel>
          )}
        </div>
      </AppFrame>

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
