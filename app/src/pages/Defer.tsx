import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SOL_LABEL } from "@/lib/constants";
import { getSolanaExplorerTxUrl } from "@/lib/utils";
import {
  delegateDefer,
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
  ArrowLeft, Search, Loader2, CheckCircle, ExternalLink,
  AlertTriangle, Coins, Shield, Clock, LogOut, Wallet,
} from "lucide-react";
import { WithWallet } from "@/components/WithWallet";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import ConfirmDialog from "@/components/ConfirmDialog";

const stateColors: Record<string, string> = {
  active: "bg-accent-lime/20",
  grace: "bg-accent-yellow/20",
  claimable: "bg-accent-red/20",
  distributed: "bg-secondary",
};

const DeferPageInner: React.FC<{
  signer: TransactionSigner | null;
  delegateAddress: Address | null;
}> = ({ signer, delegateAddress }) => {
  const { isConnected, rpc, rpcSubscriptions, disconnectWallet } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { track } = useAnalytics();

  const client: HeirloomClient = { rpc, rpcSubscriptions };

  const [authorityInput, setAuthorityInput] = useState("");
  const [heirInput, setHeirInput] = useState("");
  const [looking, setLooking] = useState(false);
  const [estate, setEstate] = useState<EstateSnapshot | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [deferring, setDeferring] = useState(false);
  const [deferTxId, setDeferTxId] = useState<string | null>(null);
  const [deferConfirmOpen, setDeferConfirmOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);

  const handleLookup = async () => {
    const a = authorityInput.trim();
    const h = heirInput.trim();
    if (!a || !h) return;
    setLooking(true);
    setLookupError(null);
    setEstate(null);
    setDeferTxId(null);
    const result = await lookupEstateSnapshot(client, a, h);
    if (!result) {
      setLookupError("Estate not found for this authority + heir pair.");
    } else if (!result.delegate) {
      setLookupError("Estate has no delegate assigned. Cannot defer.");
      setEstate(result);
    } else if (delegateAddress && result.delegate !== delegateAddress.toString()) {
      setLookupError(
        `You are not the delegate for this estate. Delegate is ${result.delegate.slice(0, 8)}...`,
      );
      setEstate(result);
    } else {
      setEstate(result);
    }
    setLooking(false);
  };

  const requestDefer = () => {
    if (!estate) return;
    if (!signer) {
      setWalletDialogOpen(true);
      return;
    }
    if (estate.isDeferred) {
      toast({
        title: "Already deferred",
        description: "Pause has already been used on this estate.",
        variant: "destructive",
      });
      return;
    }
    setDeferConfirmOpen(true);
  };

  const performDefer = async () => {
    if (!estate || !signer) return;
    setDeferring(true);
    try {
      const tx = await delegateDefer(client, signer, {
        authority: toAddress(estate.authority),
        heir: toAddress(estate.heir),
      });
      setDeferTxId(tx);
      setDeferConfirmOpen(false);
      track("defer_succeeded");
      toast({ title: "Defer submitted", description: "Claim window extended." });
      const updated = await lookupEstateSnapshot(client, estate.authority, estate.heir);
      if (updated) setEstate(updated);
    } catch (err: unknown) {
      track("defer_failed", { stage: "transaction" });
      toast({
        title: "Defer failed",
        description: errMsg(err, "Rejected"),
        variant: "destructive",
      });
    } finally {
      setDeferring(false);
    }
  };

  const canDefer =
    estate !== null &&
    delegateAddress !== null &&
    estate.delegate === delegateAddress.toString() &&
    !estate.isDeferred &&
    estate.vaultState !== "distributed";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-8 border-foreground bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-20">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-lg font-semibold hover:underline group">
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" strokeWidth={3} />
            Home
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" strokeWidth={3} />
            <span className="text-2xl font-bold">Guardian</span>
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
              <span className="neo-badge bg-accent-purple mb-4 inline-block text-white">Guardian Portal</span>
              <h2 className="text-4xl md:text-5xl leading-[0.9]">
                Extend the{" "}
                <span className="bg-accent-purple text-white px-2 inline-block rotate-[-1deg]">claim window.</span>
              </h2>
              <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
                As the assigned delegate, you can defer the claim deadline once by the estate's pause duration.
              </p>
            </div>

            <div className="neo-card-static space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
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
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
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
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Label
                      </p>
                      <p className="text-2xl font-bold truncate">{estate.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        State
                      </p>
                      <p className="text-2xl font-bold uppercase">{estate.vaultState}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="neo-border rounded-lg p-3 bg-secondary">
                    <p className="text-xs font-bold text-muted-foreground uppercase">{SOL_LABEL}</p>
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4" />
                      <p className="text-lg font-bold">
                        {formatSol(estate.solBalance)}
                      </p>
                    </div>
                  </div>
                  <div className="neo-border rounded-lg p-3 bg-secondary">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Pause Duration</p>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <p className="text-lg font-bold">{formatDuration(estate.pauseDuration)}</p>
                    </div>
                  </div>
                  <div className="neo-border rounded-lg p-3 bg-secondary">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Pause Used</p>
                    <p className="text-lg font-bold">{estate.isDeferred ? "Yes" : "No"}</p>
                  </div>
                </div>

                <div className="neo-border rounded-lg p-3 bg-accent-purple/10">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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
                      <p className="font-bold mb-2">Defer submitted</p>
                      <a
                        href={getSolanaExplorerTxUrl(deferTxId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 neo-badge bg-background hover:bg-secondary transition-colors"
                      >
                        View on Explorer <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ) : !isConnected ? (
                    <Button
                      variant="lime"
                      size="xl"
                      className="w-full"
                      onClick={() => setWalletDialogOpen(true)}
                    >
                      <Shield className="h-5 w-5" /> Connect Wallet to Defer
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="xl"
                      className="w-full"
                      onClick={requestDefer}
                      disabled={!canDefer || deferring}
                    >
                      {deferring ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Deferring...</>
                      ) : estate.isDeferred ? (
                        <><CheckCircle className="h-5 w-5" /> Already Deferred</>
                      ) : estate.vaultState === "distributed" ? (
                        <>Vault Distributed</>
                      ) : estate.delegate !== delegateAddress?.toString() ? (
                        <>Not the Delegate</>
                      ) : (
                        <><Shield className="h-5 w-5" /> Defer Claim Window</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
      </div>

      <ConfirmDialog
        open={deferConfirmOpen}
        title="Extend Claim Window?"
        description={
          estate
            ? `Extend the claim window by ${formatDuration(estate.pauseDuration)}. This guardian pause can only be used once per estate.`
            : undefined
        }
        confirmLabel="Defer"
        cancelLabel="Cancel"
        variant="default"
        loading={deferring}
        icon={<Shield className="h-6 w-6" strokeWidth={2.5} />}
        accent="bg-accent-purple/20"
        onConfirm={performDefer}
        onCancel={() => {
          if (!deferring) setDeferConfirmOpen(false);
        }}
      />

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </div>
  );
};

const DeferPage = () => (
  <WithWallet>
    {(ctx) => (
      <DeferPageInner signer={ctx?.signer ?? null} delegateAddress={ctx?.address ?? null} />
    )}
  </WithWallet>
);

export default DeferPage;
