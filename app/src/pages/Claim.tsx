import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SOL_LABEL } from "@/lib/constants";
import { claimAll, lookupNamedEstateSnapshot, type EstateSnapshot } from "@/services/heirloom";
import { getAtaAddress } from "@/lib/heirloom";
import { formatSol, formatTokenAmount, errMsg, truncateAddress } from "@/lib/utils";
import { address as toAddress, type Address, type TransactionSigner } from "@solana/kit";
import { TREASURY_ADDRESS } from "@historiah/heirloom";
import { Loader2, CheckCircle, Info } from "lucide-react";
import TokenAvatar from "@/components/TokenAvatar";
import { WithWallet } from "@/components/WithWallet";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { useTranslation } from "@heirloom/i18n";
import { useToast } from "@/hooks/use-toast";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { EstateLookupDetails, EstateLookupForm } from "@/components/portal/EstateLookup";
import {
  ConnectPanel,
  EmptyScanPanel,
  ScanFailedPanel,
  ScanningPanel,
} from "@/components/portal/ScanStates";
import { useEstateScan } from "@/hooks/useEstateScan";
import {
  EstateGlance,
  ExplorerLink,
  GlanceRow,
  GlanceStats,
} from "@/components/portal/EstateGlance";

const ClaimPageInner: React.FC<{
  signer: TransactionSigner | null;
  heirAddress: Address | null;
}> = ({ signer, heirAddress }) => {
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { t } = useTranslation("app");
  const [searchParams] = useSearchParams();
  const scan = useEstateScan("heir", heirAddress);
  const { client, add } = scan;
  const inheritances = scan.estates;

  const [claimingOwner, setClaimingOwner] = useState<string | null>(null);
  const [claimTxIds, setClaimTxIds] = useState<Record<string, string>>({});
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);

  const allVaultMints = inheritances.flatMap((inh) => inh.vaultTokens.map((vt) => vt.mint));
  const { metadata: tokenMeta } = useTokenMetadata(allVaultMints);

  // A link from a reminder email carries the owner, so that estate shows even if the scan
  // can't run.
  const ownerParam = searchParams.get("owner");
  useEffect(() => {
    if (!ownerParam || !heirAddress) return;
    let cancelled = false;
    lookupNamedEstateSnapshot(client, ownerParam, heirAddress).then((found) => {
      if (found && !cancelled) add(found);
    });
    return () => {
      cancelled = true;
    };
  }, [ownerParam, heirAddress, client, add]);

  const empty = scan.done && inheritances.length === 0;

  const handleLookup = async (owner: string) => {
    if (!heirAddress) {
      setWalletDialogOpen(true);
      return t("claim.connectTitle");
    }
    const found = await lookupNamedEstateSnapshot(client, owner, heirAddress);
    if (!found) return t("claim.notFoundError");
    add(found);
    return null;
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

      // A full claim closes the estate, so a failed re-read means it's all been claimed.
      const updated = await lookupNamedEstateSnapshot(client, inh.authority, heirAddress);
      add(
        updated ?? {
          ...inh,
          vaultState: "distributed",
          solBalance: 0,
          claimableAssets: 0,
          vaultTokens: [],
        },
      );

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
        cap={t("claim.cap")}
        headline={t("claim.headline")}
        description={t("claim.description")}
        onConnectWallet={() => setWalletDialogOpen(true)}
      >
        {!heirAddress && (
          <div data-tour="claim-connect">
            <ConnectPanel
              title={t("claim.connectTitle")}
              description={t("claim.connectDesc")}
              onConnect={() => setWalletDialogOpen(true)}
            />
          </div>
        )}

        {scan.scanning && <ScanningPanel label={t("claim.scanning")} />}

        {scan.failed && (
          <ScanFailedPanel
            title={t("claim.autoFetchUnavailable")}
            description={t("claim.autoFetchDesc")}
            onRetry={() => scan.refetch()}
          />
        )}

        {heirAddress && empty && (
          <>
            <EmptyScanPanel
              checkedWallet={t("claim.checkedWallet", { address: truncateAddress(heirAddress, 4) })}
              title={t("claim.noEstates")}
              description={t("claim.noEstatesDesc")}
            >
              <div className="mt-6" data-tour="claim-manual">
                <EstateLookupForm
                  idPrefix="claim"
                  withHeir={false}
                  primary
                  onLookup={(owner) => handleLookup(owner)}
                  extraAction={
                    <Button variant="flat-outline" onClick={() => setWalletDialogOpen(true)}>
                      {t("claim.switchWallet")}
                    </Button>
                  }
                />
              </div>
            </EmptyScanPanel>
            <p className="flex items-start gap-2.5 px-1 text-sm text-muted-foreground">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {t("claim.cardNote")}
            </p>
          </>
        )}

        {inheritances.map((inh) => {
          const txId = claimTxIds[inh.authority];
          const isClaiming = claimingOwner === inh.authority;
          const nothingToClaim =
            inh.solBalance === 0 && inh.vaultTokens.length === 0 && inh.claimableAssets === 0;
          const canClaim = inh.vaultState === "claimable" && !nothingToClaim;

          return (
            <EstateGlance
              key={inh.authority}
              label={inh.label ?? truncateAddress(inh.authority, 4)}
              state={inh.vaultState}
            >
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
                    const secondary = name && name !== primary ? name : symbol ? shortMint : null;
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
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {secondary}
                            </p>
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
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> {t("claim.claiming")}
                      </>
                    ) : nothingToClaim ? (
                      t("claim.nothingToClaim")
                    ) : inh.vaultState !== "claimable" ? (
                      t("claim.notYetClaimable")
                    ) : (
                      t("claim.claimInheritance")
                    )}
                  </Button>
                )}
              </div>
            </EstateGlance>
          );
        })}

        {/* Disconnected, this is still here so the tour has something to point at; a lookup
            asks for the wallet first, since the heir is the connected wallet. */}
        {(!heirAddress || inheritances.length > 0) && (
          <div data-tour="claim-manual">
            <EstateLookupDetails summary={t("claim.lookUpAnother")}>
              <EstateLookupForm
                idPrefix="claim-more"
                withHeir={false}
                onLookup={(owner) => handleLookup(owner)}
              />
            </EstateLookupDetails>
          </div>
        )}
      </PortalLayout>

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

const ClaimPage = () => (
  <WithWallet>
    {(ctx) => (
      <ClaimPageInner
        key={ctx?.addressStr ?? "disconnected"}
        signer={ctx?.signer ?? null}
        heirAddress={ctx?.address ?? null}
      />
    )}
  </WithWallet>
);

export default ClaimPage;
