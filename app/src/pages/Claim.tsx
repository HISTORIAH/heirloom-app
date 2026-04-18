import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { explorerTxUrl, SOL_LABEL, SOL_DECIMALS } from "@/config/constants";
import {
  discoverVaultTokenAccounts,
  fetchEstateByPair,
  fetchVaultClaimableLamports,
  getAtaAddress,
  getVaultAddress,
  sendClaimAll,
  type Client,
  type VaultTokenInfo,
} from "@/lib/contracts";
import {
  address as toAddress,
  type Address,
  type TransactionSigner,
} from "@solana/kit";
import { useWalletUi, useWalletUiSigner } from "@wallet-ui/react";
import {
  ArrowLeft, Search, Loader2, CheckCircle, ExternalLink,
  AlertTriangle, Coins, Gift,
} from "lucide-react";

interface InheritanceInfo {
  ownerAddress: string;
  vaultState: "active" | "grace" | "claimable" | "distributed";
  solBalance: number;
  label: string;
  isClaimed: boolean;
  claimableAssets: number;
  heartbeatInterval: number;
  gracePeriod: number;
  lastHeartbeat: number;
  createdAt: number;
  pausedUntil: number;
  vaultTokens: VaultTokenInfo[];
}

const stateColors: Record<string, string> = {
  active: "bg-accent-lime/20",
  grace: "bg-accent-yellow/20",
  claimable: "bg-accent-red/20",
  distributed: "bg-secondary",
};

function computeState(
  lastHeartbeat: number,
  heartbeatInterval: number,
  gracePeriod: number,
  pausedUntil: number,
  isClaimed: boolean,
  createdAt: number,
  vaultEmpty: boolean,
): InheritanceInfo["vaultState"] {
  if (isClaimed || vaultEmpty) return "distributed";
  const anchor = lastHeartbeat > 0 ? lastHeartbeat : createdAt;
  const now = Math.floor(Date.now() / 1000);
  const graceDeadline = anchor + heartbeatInterval;
  const claimableAt = Math.max(graceDeadline + gracePeriod, pausedUntil);
  if (now >= claimableAt) return "claimable";
  if (now >= graceDeadline) return "grace";
  return "active";
}

async function lookupEstate(
  client: Client,
  authorityStr: string,
  heirStr: string,
): Promise<InheritanceInfo | null> {
  try {
    const authority = toAddress(authorityStr);
    const heir = toAddress(heirStr);
    const maybe = await fetchEstateByPair(client.rpc, authority, heir);
    if (!maybe.exists) return null;
    const vaultPda = await getVaultAddress(authority, heir);
    const [lamports, vaultTokens] = await Promise.all([
      fetchVaultClaimableLamports(client.rpc, vaultPda),
      discoverVaultTokenAccounts(client.rpc, vaultPda),
    ]);
    const lastHeartbeat = Number(maybe.data.lastHeartbeat);
    const heartbeatInterval = Number(maybe.data.heartbeatInterval);
    const gracePeriod = Number(maybe.data.gracePeriod);
    const pausedUntil = Number(maybe.data.pausedUntil);
    const createdAt = Number(maybe.data.createdAt);
    const claimableAssets = maybe.data.claimableAssets;
    const vaultEmpty = claimableAssets === 0 && Number(lamports) === 0 && vaultTokens.length === 0;
    return {
      ownerAddress: authorityStr,
      vaultState: computeState(
        lastHeartbeat,
        heartbeatInterval,
        gracePeriod,
        pausedUntil,
        maybe.data.isClaimed,
        createdAt,
        vaultEmpty,
      ),
      solBalance: Number(lamports),
      label: maybe.data.label,
      isClaimed: maybe.data.isClaimed,
      claimableAssets,
      heartbeatInterval,
      gracePeriod,
      lastHeartbeat,
      createdAt,
      pausedUntil,
      vaultTokens,
    };
  } catch {
    return null;
  }
}

const ClaimPageInner: React.FC<{ signer: TransactionSigner; heirAddress: Address }> = ({
  signer,
  heirAddress,
}) => {
  const { publicKey, isConnected, rpc, rpcSubscriptions } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const client: Client = { rpc, rpcSubscriptions };

  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [inheritances, setInheritances] = useState<InheritanceInfo[]>([]);
  const [claimingOwner, setClaimingOwner] = useState<string | null>(null);
  const [claimTxIds, setClaimTxIds] = useState<Record<string, string>>({});
  const [showManual, setShowManual] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const runLookup = useCallback(
    async (ownerStr: string) => {
      const result = await lookupEstate(client, ownerStr, heirAddress.toString());
      return result;
    },
    [client, heirAddress],
  );

  useEffect(() => {
    if (!publicKey) return;
    const ownerParam = searchParams.get("owner");
    if (!ownerParam) {
      setSearchDone(true);
      return;
    }
    setSearching(true);
    runLookup(ownerParam)
      .then((result) => {
        if (result) setInheritances([result]);
      })
      .finally(() => {
        setSearching(false);
        setSearchDone(true);
      });
  }, [publicKey, searchParams, runLookup]);

  const handleManualLookup = async () => {
    if (!manualAddress.trim()) return;
    setManualLoading(true);
    setManualError(null);
    const result = await runLookup(manualAddress.trim());
    if (result) {
      setInheritances((prev) => {
        const exists = prev.some((i) => i.ownerAddress === result.ownerAddress);
        return exists
          ? prev.map((i) => (i.ownerAddress === result.ownerAddress ? result : i))
          : [...prev, result];
      });
      setShowManual(false);
      setManualAddress("");
    } else {
      setManualError("Estate not found, or you are not the heir for this owner.");
    }
    setManualLoading(false);
  };

  const handleClaim = async (inh: InheritanceInfo) => {
    setClaimingOwner(inh.ownerAddress);
    try {
      const authorityAddr = toAddress(inh.ownerAddress);

      const tokenAssets = await Promise.all(
        inh.vaultTokens.map(async (vt) => {
          const mint = toAddress(vt.mint);
          const heirAta = await getAtaAddress(heirAddress, mint);
          return {
            mint,
            vaultTokenAccount: toAddress(vt.address),
            heirTokenAccount: heirAta,
          };
        }),
      );

      const lastTx = await sendClaimAll(
        client,
        signer,
        authorityAddr,
        tokenAssets,
        inh.solBalance > 0,
      );

      setClaimTxIds((p) => ({ ...p, [inh.ownerAddress]: lastTx }));

      // Refresh inheritance data to show updated state
      const updated = await lookupEstate(client, inh.ownerAddress, heirAddress.toString());
      if (updated) {
        setInheritances((prev) =>
          prev.map((i) => (i.ownerAddress === inh.ownerAddress ? updated : i)),
        );
      } else {
        // Estate was closed on-chain — mark as distributed
        setInheritances((prev) =>
          prev.map((i) =>
            i.ownerAddress === inh.ownerAddress
              ? { ...i, vaultState: "distributed", solBalance: 0, claimableAssets: 0, vaultTokens: [], isClaimed: true }
              : i,
          ),
        );
      }

      toast({ title: "Claim submitted", description: "Assets transferred to your wallet." });
    } catch (err: unknown) {
      toast({
        title: "Claim failed",
        description: err instanceof Error ? err.message : "Rejected",
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
            Back
          </button>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5" strokeWidth={3} />
            <span className="text-2xl font-black">Claim</span>
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : "Not connected"}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 neo-slide-up">
        {!isConnected && (
          <div className="neo-card-static text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-2xl font-black mb-3">Wallet Not Connected</h2>
            <p className="text-muted-foreground font-medium">Connect to check for inheritances.</p>
          </div>
        )}

        {isConnected && (
          <>
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

            {searching && (
              <div className="neo-card-static text-center">
                <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin" strokeWidth={2.5} />
                <h3 className="text-xl font-black">Looking up estate...</h3>
              </div>
            )}

            {searchDone && !searching && inheritances.length === 0 && (
              <div className="neo-card-static text-center">
                <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-black mb-2">No Estates Found</h3>
                <p className="text-muted-foreground font-medium mb-4">
                  Look up an estate by the vault owner's Solana address.
                </p>
                <Button variant="outline" onClick={() => setShowManual(true)}>
                  Manual lookup
                </Button>
              </div>
            )}

            {inheritances.length > 0 && (
              <div className="space-y-6">
                {inheritances.map((inh) => {
                  const txId = claimTxIds[inh.ownerAddress];
                  const isClaiming = claimingOwner === inh.ownerAddress;
                  const nothingToClaim =
                    inh.claimableAssets === 0 && inh.solBalance === 0;
                  const canClaim =
                    inh.vaultState === "claimable" &&
                    !inh.isClaimed &&
                    !nothingToClaim;

                  return (
                    <div key={inh.ownerAddress} className="neo-card-static space-y-5">
                      <div className={`neo-border rounded-xl p-5 ${stateColors[inh.vaultState]}`}>
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              Owner
                            </p>
                            <p className="font-mono text-sm font-bold break-all">{inh.ownerAddress}</p>
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
                              {(inh.solBalance / Math.pow(10, SOL_DECIMALS)).toFixed(4)}
                            </p>
                          </div>
                        </div>
                        <div className="neo-border rounded-lg p-3 bg-secondary">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Tokens</p>
                          <p className="text-lg font-black">{inh.claimableAssets}</p>
                        </div>
                      </div>

                      {inh.vaultTokens.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Token Balances
                          </p>
                          {inh.vaultTokens.map((vt) => (
                            <div key={vt.address} className="neo-border rounded-lg p-3 bg-secondary flex justify-between items-center">
                              <span className="font-mono text-xs break-all max-w-[60%]">{vt.mint}</span>
                              <span className="font-black">
                                {(Number(vt.amount) / Math.pow(10, vt.decimals)).toFixed(Math.min(6, vt.decimals))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-3 border-t-2 border-foreground/10">
                        {txId ? (
                          <div className="text-center">
                            <CheckCircle className="h-10 w-10 mx-auto mb-2" strokeWidth={2.5} />
                            <p className="font-black mb-2">Claim submitted</p>
                            <a
                              href={explorerTxUrl(txId)}
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

            <div className="neo-card-static">
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
          </>
        )}
      </div>
    </div>
  );
};

const ClaimPage = () => {
  const walletUi = useWalletUi() as unknown as { account?: { address: string } | null };
  const account = walletUi?.account ?? null;

  if (!account) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="neo-card-static text-center max-w-md">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-3">Connect Wallet</h2>
          <p className="text-muted-foreground font-medium">Connect your wallet to look up inheritances.</p>
        </div>
      </div>
    );
  }

  return <ClaimPageConnected account={account} />;
};

const ClaimPageConnected: React.FC<{ account: { address: string } }> = ({ account }) => {
  const signer = useWalletUiSigner() as unknown as TransactionSigner;
  const heirAddress = toAddress(account.address);
  return <ClaimPageInner signer={signer} heirAddress={heirAddress} />;
};

export default ClaimPage;
