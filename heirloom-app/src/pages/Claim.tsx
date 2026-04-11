import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { explorerTxUrl, SOL_LABEL, USDC_LABEL, SOL_DECIMALS, USDC_DECIMALS } from "@/config/constants";
import { lookupSingleVault, claimInheritance } from "@/lib/contracts";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  ArrowLeft, Search, Loader2, CheckCircle, ExternalLink,
  AlertTriangle, Coins, DollarSign, Gift, ChevronDown,
} from "lucide-react";

interface InheritanceInfo {
  ownerAddress: string;
  vaultState: string;
  solBalance: number;
  usdcBalance: number;
  splitBps: number;
  hasClaimed: boolean;
  solShare: number;
  usdcShare: number;
  usdcMint: string;
}

const stateColors: Record<string, string> = {
  active: "bg-accent-lime/20",
  grace: "bg-accent-yellow/20",
  claimable: "bg-accent-red/20",
  distributed: "bg-secondary",
};

const ClaimPage = () => {
  const { publicKey, isConnected, connection, wallet: solWallet } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [searching, setSearching] = useState(false);
  const [inheritances, setInheritances] = useState<InheritanceInfo[]>([]);
  const [searchDone, setSearchDone] = useState(false);

  const [claimingOwner, setClaimingOwner] = useState<string | null>(null);
  const [claimTxIds, setClaimTxIds] = useState<Record<string, string>>({});

  const [showManual, setShowManual] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Check ?owner= param on mount
  useEffect(() => {
    if (!publicKey || !isConnected) return;

    const search = async () => {
      setSearching(true);
      try {
        const ownerParam = searchParams.get("owner");
        if (ownerParam) {
          const result = await lookupSingleVault(connection, ownerParam, publicKey);
          if (result) {
            setInheritances([result]);
          }
        }
      } catch {
        // Silently fail
      } finally {
        setSearching(false);
        setSearchDone(true);
      }
    };

    search();
  }, [publicKey, isConnected, connection, searchParams]);

  const handleManualLookup = async () => {
    if (!manualAddress.trim() || !publicKey) return;
    setManualLoading(true);
    setManualError(null);

    const result = await lookupSingleVault(connection, manualAddress.trim(), publicKey);
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
      setManualError("Vault not found or you are not a registered heir for this vault.");
    }

    setManualLoading(false);
  };

  const handleClaim = async (inh: InheritanceInfo) => {
    setClaimingOwner(inh.ownerAddress);
    try {
      const provider = new AnchorProvider(connection, solWallet as never, { commitment: "confirmed" });
      const txId = await claimInheritance(
        provider,
        new PublicKey(inh.ownerAddress),
        new PublicKey(inh.usdcMint)
      );
      setClaimTxIds((prev) => ({ ...prev, [inh.ownerAddress]: txId }));
      toast({ title: "Claim Submitted!", description: "Your share is being transferred to your wallet." });
    } catch (err: unknown) {
      toast({ title: "Claim Failed", description: err instanceof Error ? err.message : "Transaction rejected", variant: "destructive" });
    } finally {
      setClaimingOwner(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-8 border-foreground bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-20">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-lg font-black hover:underline group">
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" strokeWidth={3} />Back
          </button>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5" strokeWidth={3} />
            <span className="text-2xl font-black">Claim Inheritance</span>
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : "Not connected"}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 neo-slide-up">
        {!isConnected && (
          <div className="neo-card-static text-center">
            <div className="bg-accent-yellow neo-border rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black mb-3">Wallet Not Connected</h2>
            <p className="text-muted-foreground font-medium">Connect your wallet to check for available inheritances.</p>
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
                Look up a vault by owner address to check if you are named as an heir.
              </p>
            </div>

            {searching && (
              <div className="neo-card-static text-center">
                <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin" strokeWidth={2.5} />
                <h3 className="text-xl font-black mb-2">Searching for inheritances...</h3>
                <p className="text-muted-foreground font-medium">Looking up vault on the blockchain</p>
                <div className="flex justify-center gap-2 mt-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-3 h-3 bg-accent-orange neo-border rounded-full animate-pulse-slow" style={{ animationDelay: `${i * 0.3}s` }} />
                  ))}
                </div>
              </div>
            )}

            {searchDone && !searching && inheritances.length === 0 && (
              <div className="neo-card-static text-center">
                <div className="bg-secondary neo-border rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Gift className="h-10 w-10 text-muted-foreground" strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black mb-2">No Inheritances Found</h3>
                <p className="text-muted-foreground font-medium mb-4">No vaults currently list your wallet as an heir.</p>
                <Button variant="outline" onClick={() => setShowManual(true)}>Look up by vault owner address</Button>
              </div>
            )}

            {inheritances.length > 0 && (
              <div className="space-y-6">
                {inheritances.map((inh) => {
                  const txId = claimTxIds[inh.ownerAddress];
                  const isClaiming = claimingOwner === inh.ownerAddress;
                  const canClaim = inh.vaultState === "claimable" && !inh.hasClaimed;

                  return (
                    <div key={inh.ownerAddress} className="neo-card-static space-y-6">
                      <div className={`neo-border-thick rounded-2xl p-6 ${stateColors[inh.vaultState] || "bg-secondary"}`}>
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div>
                            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Vault from</p>
                            <p className="font-mono text-sm font-bold mt-1">{inh.ownerAddress.slice(0, 8)}...{inh.ownerAddress.slice(-6)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Status</p>
                            <p className="text-2xl font-black uppercase">{inh.vaultState}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                          {inh.vaultState === "claimable" && !inh.hasClaimed ? "You have an inheritance available" : "Your Allocation"}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                          <div className="neo-border rounded-xl p-4 bg-secondary">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Share</p>
                            <p className="text-3xl md:text-4xl font-black">{(inh.splitBps / 100).toFixed(0)}%</p>
                          </div>
                          <div className="neo-border rounded-xl p-4 bg-secondary">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{SOL_LABEL}</p>
                            <div className="flex items-center gap-1">
                              <Coins className="h-5 w-5 shrink-0" />
                              <p className="text-xl md:text-2xl font-black truncate">{(inh.solShare / Math.pow(10, SOL_DECIMALS)).toFixed(4)}</p>
                            </div>
                          </div>
                          {inh.usdcShare > 0 && (
                            <div className="neo-border rounded-xl p-4 bg-secondary">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{USDC_LABEL}</p>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-5 w-5 shrink-0" />
                                <p className="text-xl md:text-2xl font-black">${(inh.usdcShare / Math.pow(10, USDC_DECIMALS)).toFixed(2)}</p>
                              </div>
                            </div>
                          )}
                          <div className="neo-border rounded-xl p-4 bg-secondary">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Claim Status</p>
                            <p className="text-xl md:text-2xl font-black">
                              {inh.hasClaimed ? (
                                <span className="text-accent-lime flex items-center gap-1"><CheckCircle className="h-5 w-5" /> Claimed</span>
                              ) : (
                                <span className="text-foreground">Pending</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t-4 border-foreground">
                        {txId ? (
                          <div className="text-center">
                            <div className="bg-accent-lime neo-border rounded-full p-3 w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                              <CheckCircle className="h-7 w-7" strokeWidth={2.5} />
                            </div>
                            <p className="font-black mb-2">Claim Submitted!</p>
                            <a href={explorerTxUrl(txId)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 neo-badge bg-background hover:bg-secondary transition-colors">
                              View on Explorer <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        ) : (
                          <Button
                            variant="lime" size="xl" className={`w-full ${canClaim ? "neo-glow-lime" : ""}`}
                            onClick={() => handleClaim(inh)} disabled={!canClaim || isClaiming}
                          >
                            {isClaiming ? <><Loader2 className="h-5 w-5 animate-spin" /> Claiming...</>
                              : inh.hasClaimed ? <><CheckCircle className="h-5 w-5" /> Already Claimed</>
                              : inh.vaultState !== "claimable" ? <>Vault Not Yet Claimable ({inh.vaultState})</>
                              : <>Claim Inheritance</>}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Manual lookup */}
            <div className="neo-card-static">
              <button onClick={() => setShowManual(!showManual)} className="flex items-center justify-between w-full group">
                <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                  {inheritances.length > 0 ? "Look up another vault" : "Manual vault lookup"}
                </span>
                <div className={`transition-transform duration-200 ${showManual ? "rotate-180" : ""}`}>
                  <ChevronDown className="h-5 w-5" />
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-out ${showManual ? "max-h-40 opacity-100 mt-4" : "max-h-0 opacity-0"}`}>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="text" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} maxLength={128}
                      className="neo-input flex-1 font-mono text-sm focus:bg-accent-orange/20"
                      placeholder="Enter vault owner Solana address..."
                    />
                    <Button variant="orange" onClick={handleManualLookup} disabled={manualLoading || !manualAddress.trim()}>
                      {manualLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Search className="h-5 w-5" /> Lookup</>}
                    </Button>
                  </div>
                  {manualError && (
                    <div className="flex items-center gap-2 text-sm font-bold text-accent-red neo-shake">
                      <AlertTriangle className="h-4 w-4" />{manualError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClaimPage;
