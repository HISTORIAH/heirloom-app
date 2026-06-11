import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SOL_LABEL } from "@/lib/constants";
import { getSolanaExplorerTxUrl } from "@/lib/utils";
import {
  fetchEstatesByHeir,
  getAtaAddress,
  claimAll,
  type HeirloomClient,
} from "@/lib/heirloom";
import {
  buildSnapshotFromEstate,
  lookupEstateSnapshot,
  type EstateSnapshot,
} from "@/lib/estateLookup";
import { formatSol, formatTokenAmount, errMsg } from "@/lib/utils";
import {
  address as toAddress,
  type Address,
  type TransactionSigner,
} from "@solana/kit";
import { TREASURY_ADDRESS } from "@historiah/heirloom";
import {
  ArrowLeft, Search, Loader2, CheckCircle, ExternalLink,
  AlertTriangle, Coins, Gift, LogOut, Wallet,
} from "lucide-react";
import TokenAvatar from "@/components/TokenAvatar";
import { WithWallet } from "@/components/WithWallet";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { useAnalytics } from "@/lib/analytics";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";

const stateColors: Record<string, string> = {
  active: "bg-accent-lime/20",
  grace: "bg-accent-yellow/20",
  claimable: "bg-accent-cyan/30",
  distributed: "bg-secondary",
};

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
  const { publicKey, isConnected, rpc, rpcSubscriptions, disconnectWallet } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { track } = useAnalytics();
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
      setManualError("Estate not found, or you are not the heir for this owner.");
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
              ? { ...i, vaultState: "distributed", solBalance: 0, claimableAssets: 0, vaultTokens: [], isClaimed: true }
              : i,
          ),
        );
      }

      toast({ title: "Claim submitted", description: "Assets transferred to your wallet." });
      track("claim_succeeded", {
        asset_type_count: tokenAssets.length + 1,
        token_count: tokenAssets.length,
      });
    } catch (err: unknown) {
      track("claim_failed", { stage: "transaction" });
      toast({
        title: "Claim failed",
        description: errMsg(err, "Rejected"),
        variant: "destructive",
      });
    } finally {
      setClaimingOwner(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-8 border-foreground bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-20">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-lg font-black hover:underline group">
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" strokeWidth={3} />
            Home
          </button>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5" strokeWidth={3} />
            <span className="text-2xl font-black">Claim</span>
          </div>
          {isConnected ? (
            <button
              onClick={() => void disconnectWallet()}
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:underline"
            >
              <LogOut className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Disconnect</span>
            </button>
          ) : (
            <button
              onClick={() => setWalletDialogOpen(true)}
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:underline"
            >
              <Wallet className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Connect Wallet</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 neo-slide-up">
            <div>
              <span className="neo-badge bg-accent-orange mb-4 inline-block">Heir Portal</span>
              <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                Your inheritance{" "}
                <span className="bg-accent-orange px-2 inline-block rotate-[-1deg]">is waiting.</span>
              </h2>
              <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
                Enter the owner's Solana address to look up an estate where you're named as heir.
              </p>
            </div>

            {!isConnected && (
              <div className="neo-card-static text-center" data-tour="claim-connect">
                <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-black mb-2">Connect to find your inheritance</h3>
                <p className="text-muted-foreground font-medium mb-4">
                  Connect your wallet to scan the chain for estates that name you as heir. Browse the page freely first.
                </p>
                <Button variant="lime" onClick={() => setWalletDialogOpen(true)}>
                  Connect Wallet
                </Button>
              </div>
            )}

            {searching && (
              <div className="neo-card-static text-center">
                <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin" strokeWidth={2.5} />
                <h3 className="text-xl font-black">Scanning chain for inheritances...</h3>
              </div>
            )}

            {searchDone && !searching && autoFetchFailed && (
              <div className="neo-card-static bg-accent-yellow/20 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-black">Auto-fetch unavailable</p>
                  <p className="text-sm font-medium text-muted-foreground">
                    RPC rejected the on-chain scan. Use manual lookup below.
                  </p>
                </div>
              </div>
            )}

            {searchDone && !searching && inheritances.length === 0 && (
              <div className="neo-card-static text-center">
                <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-black mb-2">No Estates Found</h3>
                <p className="text-muted-foreground font-medium mb-4">
                  {autoFetchFailed
                    ? "Look up an estate by the vault owner's Solana address."
                    : "No estates name your wallet as heir. Try manual lookup if you expect one."}
                </p>
                <Button variant="outline" onClick={() => setShowManual(true)}>
                  Manual lookup
                </Button>
              </div>
            )}

            {inheritances.length > 0 && (
              <div className="space-y-6">
                {inheritances.map((inh) => {
                  const txId = claimTxIds[inh.authority];
                  const isClaiming = claimingOwner === inh.authority;
                  const nothingToClaim =
                    inh.solBalance === 0 &&
                    inh.vaultTokens.length === 0 &&
                    inh.claimableAssets === 0;
                  const canClaim =
                    inh.vaultState === "claimable" &&
                    !inh.isClaimed &&
                    !nothingToClaim;

                  return (
                    <div key={inh.authority} className="neo-card-static space-y-5">
                      <div className={`neo-border rounded-xl p-5 ${stateColors[inh.vaultState]}`}>
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              Owner
                            </p>
                            <p className="font-mono text-sm font-bold break-all">{inh.authority}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              Status
                            </p>
                            <p className="text-2xl font-black uppercase">{inh.vaultState}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="neo-border rounded-lg p-3 bg-secondary">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Label</p>
                          <p className="text-lg font-black">{inh.label}</p>
                        </div>
                        <div className="neo-border rounded-lg p-3 bg-secondary">
                          <p className="text-xs font-bold text-muted-foreground uppercase">{SOL_LABEL}</p>
                          <div className="flex items-center gap-1">
                            <Coins className="h-4 w-4" />
                            <p className="text-lg font-black">
                              {formatSol(inh.solBalance)}
                            </p>
                          </div>
                        </div>
                        <div className="neo-border rounded-lg p-3 bg-secondary">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Tokens</p>
                          <p className="text-lg font-black">{inh.vaultTokens.length}</p>
                        </div>
                      </div>

                      {inh.vaultTokens.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Token Balances
                          </p>
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
                                className="flex items-center gap-4 neo-border rounded-lg p-4 bg-secondary"
                              >
                                <TokenAvatar
                                  image={meta?.image}
                                  label={primary}
                                  size="md"
                                  accent="bg-accent-cyan"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-black text-lg leading-tight truncate">{primary}</p>
                                  {secondary && (
                                    <p className="text-xs font-medium text-muted-foreground truncate mt-0.5">
                                      {secondary}
                                    </p>
                                  )}
                                </div>
                                <span className="font-black text-lg tabular-nums shrink-0">
                                  {formatTokenAmount(vt.rawAmount, vt.decimals)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="pt-3 border-t-2 border-foreground/10">
                        {txId ? (
                          <div className="text-center">
                            <CheckCircle className="h-10 w-10 mx-auto mb-2" strokeWidth={2.5} />
                            <p className="font-black mb-2">Claim submitted</p>
                            <a
                              href={getSolanaExplorerTxUrl(txId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 neo-badge bg-background hover:bg-secondary transition-colors"
                            >
                              View on Explorer <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        ) : (
                          <Button
                            variant="lime"
                            size="xl"
                            className={`w-full ${canClaim ? "neo-glow-lime" : ""}`}
                            onClick={() => handleClaim(inh)}
                            disabled={!canClaim || isClaiming}
                          >
                            {isClaiming ? (
                              <><Loader2 className="h-5 w-5 animate-spin" /> Claiming...</>
                            ) : nothingToClaim ? (
                              <><CheckCircle className="h-5 w-5" /> Nothing to claim</>
                            ) : inh.isClaimed ? (
                              <><CheckCircle className="h-5 w-5" /> Already Claimed</>
                            ) : inh.vaultState !== "claimable" ? (
                              <>Not Yet Claimable ({inh.vaultState})</>
                            ) : (
                              <>Claim Inheritance</>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="neo-card-static" data-tour="claim-manual">
              <button
                onClick={() => setShowManual(!showManual)}
                className="flex items-center justify-between w-full font-bold uppercase tracking-widest text-sm text-muted-foreground"
              >
                <span>Look up another owner</span>
                <span>{showManual ? "−" : "+"}</span>
              </button>
              {showManual && (
                <div className="space-y-3 mt-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      maxLength={128}
                      className="neo-input flex-1 font-mono text-sm focus:bg-accent-orange/20"
                      placeholder="Enter vault owner Solana address..."
                    />
                    <Button variant="orange" onClick={handleManualLookup} disabled={manualLoading || !manualAddress.trim()}>
                      {manualLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <><Search className="h-5 w-5" /> Lookup</>
                      )}
                    </Button>
                  </div>
                  {manualError && (
                    <div className="flex items-center gap-2 text-sm font-bold text-accent-red">
                      <AlertTriangle className="h-4 w-4" />
                      {manualError}
                    </div>
                  )}
                </div>
              )}
            </div>
      </div>

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </div>
  );
};

const ClaimPage = () => (
  <WithWallet>
    {(ctx) => <ClaimPageInner signer={ctx?.signer ?? null} heirAddress={ctx?.address ?? null} />}
  </WithWallet>
);

export default ClaimPage;
