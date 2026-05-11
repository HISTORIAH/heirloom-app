import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@historiah/ui";
import { ArrowLeft, CheckCircle, Loader2, Globe, Heart, Clock, User } from "lucide-react";
import { createVault, connectEthWallet } from "@/services/api";
import { encodeBase58 } from "@/lib/base58";

function formatDuration(seconds: number): string {
  const d = Math.round(seconds / 86400);
  return `${d} day${d !== 1 ? "s" : ""}`;
}

export default function CreateVault() {
  const navigate = useNavigate();
  const [ethAddress, setEthAddress] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ethDepositAddress: string; dwalletSolana: string; chainVaultPda: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState("My ETH Vault");
  const [heartbeatDays, setHeartbeatDays] = useState(90);
  const [graceDays, setGraceDays] = useState(30);
  const [heirEthAddress, setHeirEthAddress] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("heirloom_eth_address");
    if (saved) setEthAddress(saved);
  }, []);

  const handleConnect = async () => {
    try {
      const wallet = await connectEthWallet();
      setEthAddress(wallet.address);
      localStorage.setItem("heirloom_eth_address", wallet.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSubmit = async () => {
    if (!ethAddress) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      // Generate a deterministic estate_id from owner ETH address + timestamp
      // so the user can recover it later without a DB
      const seed = new TextEncoder().encode(`${ethAddress}:${Date.now()}`);
      const hashBuffer = await crypto.subtle.digest("SHA-256", seed);
      const estateId = encodeBase58(new Uint8Array(hashBuffer).slice(0, 32));

      // Derive a Solana-like authority pubkey from the ETH address
      const authSeed = new TextEncoder().encode(`heirloom:authority:${ethAddress}`);
      const authHash = await crypto.subtle.digest("SHA-256", authSeed);
      const authorityPubkey = encodeBase58(new Uint8Array(authHash).slice(0, 32));

      const resp = await createVault({
        estate_id: estateId,
        authority_pubkey: authorityPubkey,
        heir_eth_address: heirEthAddress.trim(),
        chain_id: 0,
      });

      // Persist vault locally so Dashboard can show it
      const vaults = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
      vaults.push({
        estateId,
        label,
        ethDepositAddress: resp.data.eth_deposit_address,
        dwalletSolana: resp.data.dwallet_solana_address,
        chainVaultPda: resp.data.chain_vault_pda,
        heartbeatInterval: heartbeatDays * 86400,
        gracePeriod: graceDays * 86400,
        lastHeartbeat: Math.floor(Date.now() / 1000),
        isClaimed: false,
      });
      localStorage.setItem("heirloom_vaults", JSON.stringify(vaults));

      setResult({
        ethDepositAddress: resp.data.eth_deposit_address,
        dwalletSolana: resp.data.dwallet_solana_address,
        chainVaultPda: resp.data.chain_vault_pda,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!ethAddress) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b-4 border-foreground sticky top-0 bg-background z-50">
          <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-16">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 font-bold hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <span className="text-xl font-black">Create Vault</span>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-16 text-center">
          <Globe className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-black mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">You need to connect MetaMask to create a vault.</p>
          <Button variant="lime" size="lg" onClick={handleConnect}>Connect MetaMask</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-foreground sticky top-0 bg-background z-50">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-16">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 font-bold hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-xl font-black">Create ETH Vault</span>
          <span className="neo-badge bg-accent-cyan text-[10px] font-mono">
            {ethAddress.slice(0, 6)}...{ethAddress.slice(-4)}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {result ? (
          <div className="neo-border rounded-2xl bg-card neo-shadow-lg p-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-accent-lime" />
            <h2 className="text-2xl font-black mb-4">Vault Created!</h2>
            <p className="text-muted-foreground mb-6">Send ETH to this address to fund your vault.</p>

            <div className="space-y-3 text-left max-w-lg mx-auto">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">ETH Deposit Address</p>
                <p className="font-mono text-sm break-all neo-border bg-background rounded-lg p-3 mt-1">
                  {result.ethDepositAddress}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">dWallet (Solana)</p>
                <p className="font-mono text-sm break-all neo-border bg-background rounded-lg p-3 mt-1 opacity-50">
                  {result.dwalletSolana}
                </p>
              </div>
            </div>

            <Button variant="lime" size="lg" className="mt-6" onClick={() => navigate("/")}>
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-black mb-2">Create Vault</h2>
            <p className="text-muted-foreground mb-6">
              Set up an ETH vault backed by Ika MPC. Your heir can claim if you stop checking in.
            </p>

            {error && (
              <div className="neo-border bg-accent-red/20 rounded-xl p-4 mb-6">
                <p className="font-bold text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg">
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-2">Label</label>
                <input
                  type="text" value={label} maxLength={32}
                  onChange={(e) => setLabel(e.target.value.slice(0, 32))}
                  className="neo-input w-full"
                />
              </div>

              <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-accent-pink neo-border rounded-xl p-2"><Heart className="h-5 w-5" /></div>
                  <h3 className="text-lg font-black">Heartbeat Interval</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  How often you must check in to keep the vault active.
                </p>
                <input type="range" min={7} max={365} value={heartbeatDays}
                  onChange={(e) => setHeartbeatDays(Number(e.target.value))} className="w-full" />
                <div className="text-3xl font-black mt-2">{heartbeatDays}d</div>
              </div>

              <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-accent-yellow neo-border rounded-xl p-2"><Clock className="h-5 w-5" /></div>
                  <h3 className="text-lg font-black">Grace Period</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Extra time after heartbeat lapses before your heir can claim.
                </p>
                <input type="range" min={1} max={90} value={graceDays}
                  onChange={(e) => setGraceDays(Number(e.target.value))} className="w-full" />
                <div className="text-3xl font-black mt-2">{graceDays}d</div>
              </div>

              <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-accent-cyan neo-border rounded-xl p-2"><User className="h-5 w-5" /></div>
                  <h3 className="text-lg font-black">Heir ETH Address</h3>
                </div>
                <input type="text" value={heirEthAddress}
                  onChange={(e) => setHeirEthAddress(e.target.value)}
                  placeholder="0x..." className="neo-input w-full font-mono text-sm" />
                <p className="text-xs text-muted-foreground mt-2">
                  Where ETH goes if you stop checking in.
                </p>
              </div>

              <div className="neo-border rounded-xl p-4 bg-accent-lime neo-shadow-md">
                <p className="font-bold">Total protection window: <span className="text-xl font-black">{formatDuration((heartbeatDays + graceDays) * 86400)}</span></p>
              </div>

              <Button variant="lime" size="lg" className="w-full"
                disabled={submitting || !heirEthAddress.startsWith("0x")}
                onClick={handleSubmit}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                {submitting ? "Creating Vault…" : "Create Vault"}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
