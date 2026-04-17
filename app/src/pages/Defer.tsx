import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { explorerTxUrl, SOL_LABEL, SOL_DECIMALS } from "@/config/constants";
import {
  discoverVaultTokenAccounts,
  fetchEstateByPair,
  getVaultAddress,
  sendDelegateDefer,
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
  AlertTriangle, Coins, Shield, Clock,
} from "lucide-react";

interface EstateLookup {
  authorityAddress: string;
  heirAddress: string;
  delegate: string | null;
  label: string;
  isClaimed: boolean;
  isDeferred: boolean;
  vaultState: "active" | "grace" | "claimable" | "distributed";
  solBalance: number;
  claimableAssets: number;
  heartbeatInterval: number;
  gracePeriod: number;
  pauseDuration: number;
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
): EstateLookup["vaultState"] {
  if (isClaimed || vaultEmpty) return "distributed";
  const anchor = lastHeartbeat > 0 ? lastHeartbeat : createdAt;
  const now = Math.floor(Date.now() / 1000);
  const graceDeadline = anchor + heartbeatInterval;
  const claimableAt = Math.max(graceDeadline + gracePeriod, pausedUntil);
  if (now >= claimableAt) return "claimable";
  if (now >= graceDeadline) return "grace";
  return "active";
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

async function lookupEstate(
  client: Client,
  authorityStr: string,
  heirStr: string,
): Promise<EstateLookup | null> {
  try {
    const authority = toAddress(authorityStr);
    const heir = toAddress(heirStr);
    const maybe = await fetchEstateByPair(client.rpc, authority, heir);
    if (!maybe.exists) return null;
    const vaultPda = await getVaultAddress(authority, heir);
    const [{ value: lamports }, vaultTokens] = await Promise.all([
      client.rpc.getBalance(vaultPda).send(),
      discoverVaultTokenAccounts(client.rpc, vaultPda),
    ]);
    const lastHeartbeat = Number(maybe.data.lastHeartbeat);
    const heartbeatInterval = Number(maybe.data.heartbeatInterval);
    const gracePeriod = Number(maybe.data.gracePeriod);
    const pausedUntil = Number(maybe.data.pausedUntil);
    const createdAt = Number(maybe.data.createdAt);
    const claimableAssets = maybe.data.claimableAssets;
    const vaultEmpty = claimableAssets === 0 && Number(lamports) === 0;

    let delegateAddr: string | null = null;
    const del = maybe.data.delegate;
    if (del && typeof del === "object" && "__option" in del) {
      const opt = del as { __option: "Some" | "None"; value?: string };
      if (opt.__option === "Some" && opt.value) delegateAddr = opt.value;
    }

    return {
      authorityAddress: authorityStr,
      heirAddress: heirStr,
      delegate: delegateAddr,
      label: maybe.data.label,
      isClaimed: maybe.data.isClaimed,
      isDeferred: maybe.data.isDeferred,
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
      claimableAssets,
      heartbeatInterval,
      gracePeriod,
      pauseDuration: Number(maybe.data.pauseDuration),
      lastHeartbeat,
      createdAt,
      pausedUntil,
      vaultTokens,
    };
  } catch {
    return null;
  }
}

const DeferPageInner: React.FC<{ signer: TransactionSigner; delegateAddress: Address }> = ({
  signer,
  delegateAddress,
}) => {
  const { publicKey, isConnected, rpc, rpcSubscriptions } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();

  const client: Client = { rpc, rpcSubscriptions };

  const [authorityInput, setAuthorityInput] = useState("");
  const [heirInput, setHeirInput] = useState("");
  const [looking, setLooking] = useState(false);
  const [estate, setEstate] = useState<EstateLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [deferring, setDeferring] = useState(false);
  const [deferTxId, setDeferTxId] = useState<string | null>(null);

  const handleLookup = async () => {
    const a = authorityInput.trim();
    const h = heirInput.trim();
    if (!a || !h) return;
    setLooking(true);
    setLookupError(null);
    setEstate(null);
    setDeferTxId(null);
    const result = await lookupEstate(client, a, h);
    if (!result) {
      setLookupError("Estate not found for this authority + heir pair.");
    } else if (!result.delegate) {
      setLookupError("Estate has no delegate assigned. Cannot defer.");
      setEstate(result);
    } else if (result.delegate !== delegateAddress.toString()) {
      setLookupError(
        `You are not the delegate for this estate. Delegate is ${result.delegate.slice(0, 8)}...`,
      );
      setEstate(result);
    } else {
      setEstate(result);
    }
    setLooking(false);
  };

  const handleDefer = async () => {
    if (!estate) return;
    if (estate.isDeferred) {
      toast({
        title: "Already deferred",
        description: "Pause has already been used on this estate.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`Extend claim window by ${formatDuration(estate.pauseDuration)}?`)) return;
    setDeferring(true);
    try {
      const tx = await sendDelegateDefer(client, {
        delegate: signer,
        authority: toAddress(estate.authorityAddress),
        heir: toAddress(estate.heirAddress),
      });
      setDeferTxId(tx);
      toast({ title: "Defer submitted", description: "Claim window extended." });
      const updated = await lookupEstate(client, estate.authorityAddress, estate.heirAddress);
      if (updated) setEstate(updated);
    } catch (err: unknown) {
      toast({
        title: "Defer failed",
        description: err instanceof Error ? err.message : "Rejected",
        variant: "destructive",
      });
    } finally {
      setDeferring(false);
    }
  };

  const canDefer =
    estate !== null &&
    estate.delegate === delegateAddress.toString() &&
    !estate.isDeferred &&
    !estate.isClaimed &&
    estate.vaultState !== "distributed";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-8 border-foreground bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-20">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-lg font-black hover:underline group">
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" strokeWidth={3} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" strokeWidth={3} />
            <span className="text-2xl font-black">Guardian</span>
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
            <p className="text-muted-foreground font-medium">Connect to act as guardian.</p>
          </div>
        )}

        {isConnected && (
          <>
            <div>
              <span className="neo-badge bg-accent-purple mb-4 inline-block text-white">Guardian Portal</span>
              <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                Extend the{" "}
                <span className="bg-accent-purple text-white px-2 inline-block rotate-[-1deg]">claim window.</span>
              </h2>
              <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
                As the assigned delegate, you can defer the claim deadline once by the estate's pause duration.
              </p>
            </div>

            <div className="neo-card-static space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                  Authority (Owner) Address
                </label>
                <input
                  type="text"
                  value={authorityInput}
                  onChange={(e) => setAuthorityInput(e.target.value)}
                  maxLength={128}
                  className="neo-input w-full font-mono text-sm focus:bg-accent-purple/10"
                  placeholder="Vault owner Solana address..."
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                  Heir Address
                </label>
                <input
                  type="text"
                  value={heirInput}
                  onChange={(e) => setHeirInput(e.target.value)}
                  maxLength={128}
                  className="neo-input w-full font-mono text-sm focus:bg-accent-purple/10"
                  placeholder="Heir Solana address..."
                />
              </div>
              <Button
                variant="default"
                size="lg"
                onClick={handleLookup}
                disabled={looking || !authorityInput.trim() || !heirInput.trim()}
                className="w-full"
              >
                {looking ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Looking up...</>
                ) : (
                  <><Search className="h-5 w-5" /> Look Up Estate</>
                )}
              </Button>
              {lookupError && (
                <div className="flex items-center gap-2 text-sm font-bold text-accent-red">
                  <AlertTriangle className="h-4 w-4" />
                  {lookupError}
                </div>
              )}
            </div>

            {estate && (
              <div className="neo-card-static space-y-5">
                <div className={`neo-border rounded-xl p-5 ${stateColors[estate.vaultState]}`}>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Label
                      </p>
                      <p className="text-2xl font-black truncate">{estate.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        State
                      </p>
                      <p className="text-2xl font-black uppercase">{estate.vaultState}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="neo-border rounded-lg p-3 bg-secondary">
                    <p className="text-xs font-bold text-muted-foreground uppercase">{SOL_LABEL}</p>
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4" />
                      <p className="text-lg font-black">
                        {(estate.solBalance / Math.pow(10, SOL_DECIMALS)).toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <div className="neo-border rounded-lg p-3 bg-secondary">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Pause Duration</p>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <p className="text-lg font-black">{formatDuration(estate.pauseDuration)}</p>
                    </div>
                  </div>
                  <div className="neo-border rounded-lg p-3 bg-secondary">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Pause Used</p>
                    <p className="text-lg font-black">{estate.isDeferred ? "Yes" : "No"}</p>
                  </div>
                </div>

                <div className="neo-border rounded-lg p-3 bg-accent-purple/10">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Delegate
                  </p>
                  <p className="font-mono text-xs break-all">
                    {estate.delegate ?? "None"}
                  </p>
                </div>

                <div className="pt-3 border-t-2 border-foreground/10">
                  {deferTxId ? (
                    <div className="text-center">
                      <CheckCircle className="h-10 w-10 mx-auto mb-2" strokeWidth={2.5} />
                      <p className="font-black mb-2">Defer submitted</p>
                      <a
                        href={explorerTxUrl(deferTxId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 neo-badge bg-background hover:bg-secondary transition-colors"
                      >
                        View on Explorer <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ) : (
                    <Button
                      variant="default"
                      size="xl"
                      className="w-full"
                      onClick={handleDefer}
                      disabled={!canDefer || deferring}
                    >
                      {deferring ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Deferring...</>
                      ) : estate.isDeferred ? (
                        <><CheckCircle className="h-5 w-5" /> Already Deferred</>
                      ) : estate.isClaimed ? (
                        <><CheckCircle className="h-5 w-5" /> Already Claimed</>
                      ) : estate.vaultState === "distributed" ? (
                        <>Vault Distributed</>
                      ) : estate.delegate !== delegateAddress.toString() ? (
                        <>Not the Delegate</>
                      ) : (
                        <><Shield className="h-5 w-5" /> Defer Claim Window</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const DeferPage = () => {
  const walletUi = useWalletUi() as unknown as { account?: { address: string } | null };
  const account = walletUi?.account ?? null;

  if (!account) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="neo-card-static text-center max-w-md">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-3">Connect Wallet</h2>
          <p className="text-muted-foreground font-medium">Connect your wallet to act as guardian.</p>
        </div>
      </div>
    );
  }

  return <DeferPageConnected account={account} />;
};

const DeferPageConnected: React.FC<{ account: { address: string } }> = ({ account }) => {
  const signer = useWalletUiSigner() as unknown as TransactionSigner;
  const delegateAddress = toAddress(account.address);
  return <DeferPageInner signer={signer} delegateAddress={delegateAddress} />;
};

export default DeferPage;
