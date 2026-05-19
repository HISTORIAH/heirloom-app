import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SOL_LABEL } from "@/lib/constants";
import { getSolanaExplorerTxUrl } from "@/lib/utils";
import {
  updateFields,
} from "@/lib/heirloom";
import type { HeirloomClient } from "@/lib/heirloom";
import {
  lookupEstateSnapshot,
  type EstateSnapshot,
} from "@/lib/estateLookup";
import { formatDuration, formatSol, errMsg } from "@/lib/utils";
import {
  address as toAddress,
  type Address,
  type TransactionSigner,
} from "@solana/kit";
import {
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Coins,
  Heart,
  Clock,
} from "lucide-react";
import { RequireWallet } from "@/components/RequireWallet";

const stateColors: Record<string, string> = {
  active: "bg-accent-lime/20",
  grace: "bg-accent-yellow/20",
  claimable: "bg-accent-red/20",
  distributed: "bg-secondary",
};

const HeartbeatPageInner: React.FC<{
  signer: TransactionSigner;
  walletAddress: Address;
}> = ({ signer, walletAddress }) => {
  const { publicKey, isConnected, rpc, rpcSubscriptions } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();

  const client: HeirloomClient = { rpc, rpcSubscriptions };

  const [authorityInput, setAuthorityInput] = useState("");
  const [heirInput, setHeirInput] = useState("");
  const [looking, setLooking] = useState(false);
  const [estate, setEstate] = useState<EstateSnapshot | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [hbTxId, setHbTxId] = useState<string | null>(null);

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
      setLookupError("Estate not found for this authority + heir pair.");
    } else if (!result.hbSigner) {
      setLookupError("Estate has no heartbeat signer assigned.");
      setEstate(result);
    } else if (result.hbSigner !== walletAddress.toString()) {
      setLookupError(
        `You are not the heartbeat signer for this estate. Signer is ${result.hbSigner.slice(0, 8)}...`,
      );
      setEstate(result);
    } else {
      setEstate(result);
    }
    setLooking(false);
  };

  const handleSendHeartbeat = async () => {
    if (!estate) return;
    setSigning(true);
    try {
      const tx = await updateFields(client, signer, {
        authorityAddress: toAddress(estate.authority),
        heir: toAddress(estate.heir),
      });
      setHbTxId(tx);
      toast({ title: "Heartbeat sent", description: "Vault timer reset." });
      const updated = await lookupEstateSnapshot(client, estate.authority, estate.heir);
      if (updated) setEstate(updated);
    } catch (err: unknown) {
      toast({
        title: "Heartbeat failed",
        description: errMsg(err, "Rejected"),
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  const canSign =
    estate !== null &&
    estate.hbSigner === walletAddress.toString() &&
    !estate.isClaimed &&
    estate.vaultState !== "distributed";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-8 border-foreground bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-20">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-lg font-black hover:underline group"
          >
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" strokeWidth={3} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5" strokeWidth={3} />
            <span className="text-2xl font-black">Heartbeat Signer</span>
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
            <p className="text-muted-foreground font-medium">Connect to act as heartbeat signer.</p>
          </div>
        )}

        {isConnected && (
          <>
            <div>
              <span className="neo-badge bg-accent-pink mb-4 inline-block">Hot Signer Portal</span>
              <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                Refresh the{" "}
                <span className="bg-accent-pink px-2 inline-block rotate-[-1deg]">heartbeat.</span>
              </h2>
              <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
                As the registered heartbeat signer, you can ping the estate without holding
                full authority.
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
                  className="neo-input w-full font-mono text-sm focus:bg-accent-pink/10"
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
                  className="neo-input w-full font-mono text-sm focus:bg-accent-pink/10"
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
                        {formatSol(estate.solBalance)}
                      </p>
                    </div>
                  </div>
                  <div className="neo-border rounded-lg p-3 bg-secondary">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Interval</p>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <p className="text-lg font-black">{formatDuration(estate.heartbeatInterval)}</p>
                    </div>
                  </div>
                  <div className="neo-border rounded-lg p-3 bg-secondary">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Last Heartbeat</p>
                    <p className="text-xs font-black">
                      {estate.lastHeartbeat > 0
                        ? new Date(estate.lastHeartbeat * 1000).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="neo-border rounded-lg p-3 bg-accent-pink/10">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Heartbeat Signer
                  </p>
                  <p className="font-mono text-xs break-all">{estate.hbSigner ?? "None"}</p>
                </div>

                <div className="pt-3 border-t-2 border-foreground/10">
                  {hbTxId ? (
                    <div className="text-center">
                      <CheckCircle className="h-10 w-10 mx-auto mb-2" strokeWidth={2.5} />
                      <p className="font-black mb-2">Heartbeat sent</p>
                      <a
                        href={getSolanaExplorerTxUrl(hbTxId)}
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
                      onClick={handleSendHeartbeat}
                      disabled={!canSign || signing}
                    >
                      {signing ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Signing...</>
                      ) : estate.isClaimed ? (
                        <><CheckCircle className="h-5 w-5" /> Already Claimed</>
                      ) : estate.vaultState === "distributed" ? (
                        <>Vault Distributed</>
                      ) : estate.hbSigner !== walletAddress.toString() ? (
                        <>Not the Heartbeat Signer</>
                      ) : (
                        <><Heart className="h-5 w-5" /> Send Heartbeat</>
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

const HeartbeatPage = () => (
  <RequireWallet message="Connect your wallet to send heartbeats.">
    {({ signer, address }) => <HeartbeatPageInner signer={signer} walletAddress={address} />}
  </RequireWallet>
);

export default HeartbeatPage;
