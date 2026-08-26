import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { SOL_LABEL } from "@/lib/constants";
import {
  fetchEstatesByHeir,
  claimAll,
  buildSnapshotFromEstate,
  lookupEstateSnapshot,
  type EstateSnapshot,
} from "@/services/heirloom";
import {
  getAtaAddress,
  type HeirloomClient,
} from "@/lib/heirloom";
import { formatSol, formatTokenAmount, errMsg, truncateAddress } from "@/lib/utils";
import {
  address as toAddress,
  type Address,
  type TransactionSigner,
} from "@solana/kit";
import { TREASURY_ADDRESS } from "@historiah/heirloom";
import { Search, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import TokenAvatar from "@/components/TokenAvatar";
import { WithWallet } from "@/components/WithWallet";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { useTranslation } from "@heirloom/i18n";
import { useToast } from "@/hooks/use-toast";
import { Panel } from "@/components/surface/Panel";
import { PortalLayout } from "@/components/portal/PortalLayout";
import {
  EstateGlance,
  ExplorerLink,
  GlanceRow,
  GlanceStats,
} from "@/components/portal/EstateGlance";

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
      <PortalLayout
        cap={t("claim.heirPortal")}
        headline={
          <>
            {t("claim.headline1")} {t("claim.headline2")}
          </>
        }
        description={t("claim.description")}
        onConnectWallet={() => setWalletDialogOpen(true)}
      >
        {!isConnected && (
          <div data-tour="claim-connect">
            <Panel className="text-center">
            <h2 className="ed-h3">{t("claim.connectTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("claim.connectDesc")}</p>
            <Button variant="flat-yellow" className="mt-5" onClick={() => setWalletDialogOpen(true)}>
              {t("common.connectWallet")}
            </Button>
            </Panel>
          </div>
        )}

        {searching && (
          <Panel className="items-center text-center">
            <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />
            <h2 className="ed-h3 mt-3">{t("claim.scanning")}</h2>
          </Panel>
        )}

        {searchDone && !searching && autoFetchFailed && (
          <Panel tone="yellow">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <div>
                <p className="font-semibold">{t("claim.autoFetchUnavailable")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("claim.autoFetchDesc")}</p>
              </div>
            </div>
          </Panel>
        )}

        {searchDone && !searching && inheritances.length === 0 && (
          <Panel className="text-center">
            <h2 className="ed-h3">{t("claim.noEstates")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {autoFetchFailed ? t("claim.noEstatesDesc1") : t("claim.noEstatesDesc2")}
            </p>
            <Button variant="flat-outline" className="mt-5" onClick={() => setShowManual(true)}>
              {t("claim.manualLookup")}
            </Button>
          </Panel>
        )}

        {inheritances.map((inh) => {
          const txId = claimTxIds[inh.authority];
          const isClaiming = claimingOwner === inh.authority;
          const nothingToClaim =
            inh.solBalance === 0 &&
            inh.vaultTokens.length === 0 &&
            inh.claimableAssets === 0;
          const canClaim = inh.vaultState === "claimable" && !nothingToClaim;

          return (
            <EstateGlance key={inh.authority} label={inh.label} state={inh.vaultState}>
              <GlanceStats>
                <GlanceRow
                  label={t("claim.owner")}
                  value={<span title={inh.authority}>{truncateAddress(inh.authority, 4)}</span>}
                  mono
                />
                <GlanceRow label={SOL_LABEL} value={formatSol(inh.solBalance)} />
                <GlanceRow label={t("claim.tokens")} value={inh.vaultTokens.length} />
              </GlanceStats>

              {inh.vaultTokens.length > 0 && (
                <div className="mt-5 divide-y divide-tile-line border-t border-tile-line">
                  {inh.vaultTokens.map((vt) => {
                    const meta = tokenMeta.get(vt.mint);
                    const symbol = meta?.symbol;
                    const name = meta?.name;
                    const shortMint = `${vt.mint.slice(0, 4)}…${vt.mint.slice(-4)}`;
                    const primary = symbol || name || shortMint;
                    const secondary =
                      name && name !== primary ? name : symbol ? shortMint : null;
                    return (
                      <div key={vt.ata} className="flex items-center gap-3 py-3">
                        <TokenAvatar
                          image={meta?.image}
                          label={primary}
                          size="md"
                          accent="bg-accent-cyan"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-tight">{primary}</p>
                          {secondary && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{secondary}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatTokenAmount(vt.rawAmount, vt.decimals)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 border-t border-tile-line pt-5">
                {txId ? (
                  <div className="text-center">
                    <CheckCircle className="mx-auto mb-2 h-6 w-6" strokeWidth={2} />
                    <p className="font-semibold">{t("claim.claimSubmitted")}</p>
                    <div className="mt-2">
                      <ExplorerLink txId={txId}>{t("common.viewOnExplorer")}</ExplorerLink>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant={canClaim ? "flat-yellow" : "flat"}
                    size="lg"
                    className="w-full"
                    onClick={() => handleClaim(inh)}
                    disabled={!canClaim || isClaiming}
                  >
                    {isClaiming ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> {t("claim.claiming")}</>
                    ) : nothingToClaim ? (
                      t("claim.nothingToClaim")
                    ) : inh.vaultState !== "claimable" ? (
                      `${t("claim.notYetClaimable")} (${inh.vaultState})`
                    ) : (
                      t("claim.claimInheritance")
                    )}
                  </Button>
                )}
              </div>
            </EstateGlance>
          );
        })}

        <div data-tour="claim-manual">
        <Panel>
          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="ed-label">{t("claim.lookUpAnother")}</span>
            <span className="text-sm text-muted-foreground">{showManual ? "−" : "+"}</span>
          </button>
          {showManual && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  maxLength={128}
                  spellCheck={false}
                  autoComplete="off"
                  className="ed-input flex-1 font-mono"
                  placeholder={t("claim.ownerPlaceholder")}
                />
                <Button
                  variant="flat"
                  onClick={handleManualLookup}
                  disabled={manualLoading || !manualAddress.trim()}
                >
                  {manualLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><Search className="h-4 w-4" /> {t("claim.lookup")}</>
                  )}
                </Button>
              </div>
              {manualError && (
                <p className="flex items-center gap-2 text-sm font-semibold text-accent-red">
                  <AlertTriangle className="h-4 w-4" />
                  {manualError}
                </p>
              )}
            </div>
          )}
        </Panel>
        </div>
      </PortalLayout>

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
