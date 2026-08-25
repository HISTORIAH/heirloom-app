import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SOL_LABEL } from "@/lib/constants";
import { getSolanaExplorerTxUrl } from "@/lib/utils";
import {
  fetchEstatesByHeir,
} from "@/services/heirloom";
import {
  getAtaAddress,
  type HeirloomClient,
} from "@/lib/heirloom";
import { claimAll } from "@/services/heirloom";
import {
  buildSnapshotFromEstate,
  lookupEstateSnapshot,
  type EstateSnapshot,
} from "@/services/heirloom";
import { formatSol, formatTokenAmount, errMsg } from "@/lib/utils";
import {
  address as toAddress,
  type Address,
  type TransactionSigner,
} from "@solana/kit";
import { TREASURY_ADDRESS } from "@historiah/heirloom";
import { Search, Loader2, Check, ExternalLink, AlertTriangle, Gift } from "lucide-react";
import AppFrame, { PageHead } from "@/components/app/AppFrame";
import PortalLead from "@/components/app/PortalLead";
import { Panel, StatCell } from "@/components/app/Panel";
import StateTag from "@/components/app/StateTag";
import TokenAvatar from "@/components/TokenAvatar";
import { WithWallet } from "@/components/WithWallet";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { useTranslation } from "@heirloom/i18n";

async function autoFetchInheritances(
  client: HeirloomClient,
  heirAddress: Address,
): Promise<EstateSnapshot[]> {
  const estates = await fetchEstatesByHeir(client, heirAddress);
  const results = await Promise.all(
    estates.map(async (e) => {
      try {
        return await buildSnapshotFromEstate(
          client,
          e.data.authority,
          heirAddress.toString(),
          e.data,
        );
      } catch {
        return null;
      }
    }),
  );
  return results.filter((r): r is EstateSnapshot => r !== null);
}

const ClaimPageInner: React.FC<{
  signer: TransactionSigner | null;
  heirAddress: Address | null;
}> = ({ signer, heirAddress }) => {
  const { publicKey, isConnected, rpc, rpcSubscriptions } = useWallet();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { t } = useTranslation("app");
  const [searchParams] = useSearchParams();

  const client: HeirloomClient = useMemo(() => ({ rpc, rpcSubscriptions }), [rpc, rpcSubscriptions]);

  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [autoFetchFailed, setAutoFetchFailed] = useState(false);
  const [inheritances, setInheritances] = useState<EstateSnapshot[]>([]);
  const [claimingOwner, setClaimingOwner] = useState<string | null>(null);
  const [claimTxIds, setClaimTxIds] = useState<Record<string, string>>({});
  const [showManual, setShowManual] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);

  const allVaultMints = inheritances.flatMap((inh) => inh.vaultTokens.map((vt) => vt.mint));
  const { metadata: tokenMeta } = useTokenMetadata(allVaultMints);

  const runLookup = useCallback(
    async (ownerStr: string) => {
      if (!heirAddress) return null;
      return lookupEstateSnapshot(client, ownerStr, heirAddress.toString());
    },
    [client, heirAddress],
  );

  useEffect(() => {
    if (!publicKey || !heirAddress) return;
    let cancelled = false;
    const ownerParam = searchParams.get("owner");
    setSearching(true);
    setAutoFetchFailed(false);

    (async () => {
      const merged = new Map<string, EstateSnapshot>();
      try {
        const auto = await autoFetchInheritances(client, heirAddress);
        for (const inh of auto) merged.set(inh.authority, inh);
      } catch (err) {
        console.error("Auto-fetch inheritances failed:", err);
        if (!cancelled) setAutoFetchFailed(true);
      }

      if (ownerParam && !merged.has(ownerParam)) {
        const single = await runLookup(ownerParam);
        if (single) merged.set(single.authority, single);
      }

      if (cancelled) return;
      setInheritances(Array.from(merged.values()));
      setSearching(false);
      setSearchDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [publicKey, searchParams, runLookup, client, heirAddress]);

  const handleManualLookup = async () => {
    if (!manualAddress.trim()) return;
    if (!heirAddress) {
      setWalletDialogOpen(true);
      return;
    }
    setManualLoading(true);
    setManualError(null);
    const result = await runLookup(manualAddress.trim());
    if (result) {
      setInheritances((prev) => {
        const exists = prev.some((i) => i.authority === result.authority);
        return exists
          ? prev.map((i) => (i.authority === result.authority ? result : i))
          : [...prev, result];
      });
      setShowManual(false);
      setManualAddress("");
    } else {
      setManualError(t("claim.notFoundError"));
    }
    setManualLoading(false);
  };

  const handleClaim = async (inh: EstateSnapshot) => {
    if (!signer || !heirAddress) {
      setWalletDialogOpen(true);
      return;
    }
    setClaimingOwner(inh.authority);
    try {
      const authorityAddr = toAddress(inh.authority);

      const tokenAssets = await Promise.all(
        inh.vaultTokens.map(async (vt) => {
          const mint = toAddress(vt.mint);
          const tokenProgram = toAddress(vt.tokenProgram);
          const [heirAta, treasuryAta] = await Promise.all([
            getAtaAddress(heirAddress, mint, tokenProgram),
            getAtaAddress(TREASURY_ADDRESS, mint, tokenProgram),
          ]);
          return {
            mint,
            vaultTokenAccount: toAddress(vt.ata),
            heirTokenAccount: heirAta,
            treasuryTokenAccount: treasuryAta,
            tokenProgram,
          };
        }),
      );

      const lastTx = await claimAll(
        client,
        signer,
        authorityAddr,
        tokenAssets,
        true, // Always claim SOL — closes estate/vault and returns rent
      );

      setClaimTxIds((p) => ({ ...p, [inh.authority]: lastTx }));

      const updated = await lookupEstateSnapshot(client, inh.authority, heirAddress.toString());
      if (updated) {
        setInheritances((prev) =>
          prev.map((i) => (i.authority === inh.authority ? updated : i)),
        );
      } else {
        setInheritances((prev) =>
          prev.map((i) =>
            i.authority === inh.authority
              ? { ...i, vaultState: "distributed", solBalance: 0, claimableAssets: 0, vaultTokens: [] }
              : i,
          ),
        );
      }

      toast({ title: t("claim.toastClaimTitle"), description: t("claim.toastClaimDesc") });
      track("claim_succeeded", {
        asset_type_count: tokenAssets.length + 1,
        token_count: tokenAssets.length,
      });
    } catch (err: unknown) {
      track("claim_failed", { stage: "transaction" });
      toast({
        title: t("claim.toastFailTitle"),
        description: errMsg(err, t("claim.rejected")),
        variant: "destructive",
      });
    } finally {
      setClaimingOwner(null);
    }
  };

  return (
    <>
      <AppFrame
        measure="narrow"
        head={
          <PageHead
            label={t("claim.title")}
            backTo="/"
            backLabel={t("common.home")}
            right={<span className="tag">{t("claim.heirPortal")}</span>}
          />
        }
      >
        <div className="rise-in">
          <PortalLead
            headline={
              <>
                {t("claim.headline1")}{" "}
                <span className="bg-accent-yellow px-2">{t("claim.headline2")}</span>
              </>
            }
            lede={t("claim.description")}
          />

          <div className="mt-9 space-y-5">
            {!isConnected && (
              <Panel className="text-center" data-tour="claim-connect">
                <Gift className="mx-auto h-5 w-5 text-muted-foreground" strokeWidth={2} />
                <h2 className="ed-h3 mt-4">{t("claim.connectTitle")}</h2>
                <p className="mx-auto mt-2 max-w-[44ch] text-sm font-medium text-muted-foreground">
                  {t("claim.connectDesc")}
                </p>
                <Button variant="yellow" className="mt-6" onClick={() => setWalletDialogOpen(true)}>
                  {t("common.connectWallet")}
                </Button>
              </Panel>
            )}

            {searching && (
              <Panel className="flex items-center justify-center gap-3 py-10">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                <span className="cap cap-ink">{t("claim.scanning")}</span>
              </Panel>
            )}

            {searchDone && !searching && autoFetchFailed && (
              <Panel tone="soft" className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                <div>
                  <p className="text-sm font-semibold">{t("claim.autoFetchUnavailable")}</p>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {t("claim.autoFetchDesc")}
                  </p>
                </div>
              </Panel>
            )}

            {searchDone && !searching && inheritances.length === 0 && (
              <Panel className="text-center">
                <Gift className="mx-auto h-5 w-5 text-muted-foreground" strokeWidth={2} />
                <h2 className="ed-h3 mt-4">{t("claim.noEstates")}</h2>
                <p className="mx-auto mt-2 max-w-[46ch] text-sm font-medium text-muted-foreground">
                  {autoFetchFailed ? t("claim.noEstatesDesc1") : t("claim.noEstatesDesc2")}
                </p>
                <Button variant="outline" className="mt-6" onClick={() => setShowManual(true)}>
                  {t("claim.manualLookup")}
                </Button>
              </Panel>
            )}

            {/* One panel per inheritance: whose it is, what is in it, and the
                single button that moves it. */}
            {inheritances.map((inh) => {
              const txId = claimTxIds[inh.authority];
              const isClaiming = claimingOwner === inh.authority;
              const nothingToClaim =
                inh.solBalance === 0 &&
                inh.vaultTokens.length === 0 &&
                inh.claimableAssets === 0;
              const canClaim = inh.vaultState === "claimable" && !nothingToClaim;

              return (
                <Panel key={inh.authority} pad={false}>
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-tile-line px-5 py-4 md:px-6">
                    <div className="min-w-0">
                      <p className="cap">{t("claim.owner")}</p>
                      <p className="mt-1.5 break-all font-mono text-xs font-medium">{inh.authority}</p>
                    </div>
                    <div className="text-right">
                      <p className="cap">{t("claim.status")}</p>
                      <StateTag state={inh.vaultState} className="mt-1.5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3">
                    <div className="px-5 py-5 md:px-6">
                      <StatCell label={t("claim.label")} value={inh.label} />
                    </div>
                    <div className="border-t border-tile-line px-5 py-5 sm:border-l sm:border-t-0 md:px-6">
                      <StatCell label={SOL_LABEL} value={formatSol(inh.solBalance)} />
                    </div>
                    <div className="border-t border-tile-line px-5 py-5 sm:border-l sm:border-t-0 md:px-6">
                      <StatCell label={t("claim.tokens")} value={inh.vaultTokens.length} />
                    </div>
                  </div>

                  {inh.vaultTokens.length > 0 && (
                    <div className="border-t border-tile-line px-5 py-4 md:px-6">
                      <p className="cap">{t("claim.tokenBalances")}</p>
                      <div className="mt-1">
                        {inh.vaultTokens.map((vt) => {
                          const meta = tokenMeta.get(vt.mint);
                          const symbol = meta?.symbol;
                          const name = meta?.name;
                          const shortMint = `${vt.mint.slice(0, 4)}…${vt.mint.slice(-4)}`;
                          const primary = symbol || name || shortMint;
                          const secondary =
                            name && name !== primary ? name : symbol ? shortMint : null;
                          return (
                            <div
                              key={vt.ata}
                              className="flex items-center gap-3 border-t border-tile-line py-3 first:border-t-0"
                            >
                              <TokenAvatar image={meta?.image} label={primary} size="md" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold leading-tight">{primary}</p>
                                {secondary && (
                                  <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                                    {secondary}
                                  </p>
                                )}
                              </div>
                              <span className="num shrink-0 text-base">
                                {formatTokenAmount(vt.rawAmount, vt.decimals)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-tile-line px-5 py-5 md:px-6">
                    {txId ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="tag tag-live">
                          <Check className="h-3 w-3" strokeWidth={2.5} /> {t("claim.claimSubmitted")}
                        </span>
                        <a
                          href={getSolanaExplorerTxUrl(txId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] underline-offset-4 hover:underline"
                        >
                          {t("common.viewOnExplorer")} <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <Button
                        variant={canClaim ? "yellow" : "outline"}
                        size="xl"
                        className="w-full"
                        onClick={() => handleClaim(inh)}
                        disabled={!canClaim || isClaiming}
                      >
                        {isClaiming ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> {t("claim.claiming")}</>
                        ) : nothingToClaim ? (
                          <><Check className="h-4 w-4" /> {t("claim.nothingToClaim")}</>
                        ) : inh.vaultState !== "claimable" ? (
                          <>{t("claim.notYetClaimable")} ({inh.vaultState})</>
                        ) : (
                          <>{t("claim.claimInheritance")}</>
                        )}
                      </Button>
                    )}
                  </div>
                </Panel>
              );
            })}

            {/* Manual lookup stays available at the foot of the page: the scan
                does not always find an estate, and the heir may only have the
                owner's address to go on. */}
            <Panel data-tour="claim-manual">
              <button
                onClick={() => setShowManual(!showManual)}
                aria-expanded={showManual}
                className="flex w-full items-center justify-between gap-3"
              >
                <span className="cap cap-ink">{t("claim.lookUpAnother")}</span>
                <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
                <span className="cap">{showManual ? "−" : "+"}</span>
              </button>

              {showManual && (
                <div className="mt-4">
                  <div className="flex flex-col gap-2.5 sm:flex-row">
                    <input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      maxLength={128}
                      className="field field-mono"
                      placeholder={t("claim.ownerPlaceholder")}
                    />
                    <Button
                      variant="default"
                      onClick={handleManualLookup}
                      disabled={manualLoading || !manualAddress.trim()}
                      className="shrink-0"
                    >
                      {manualLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <><Search className="h-4 w-4" /> {t("claim.lookup")}</>
                      )}
                    </Button>
                  </div>
                  {manualError && (
                    <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-accent-red">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                      {manualError}
                    </p>
                  )}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </AppFrame>

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

const ClaimPage = () => (
  <WithWallet>
    {(ctx) => <ClaimPageInner signer={ctx?.signer ?? null} heirAddress={ctx?.address ?? null} />}
  </WithWallet>
);

export default ClaimPage;
