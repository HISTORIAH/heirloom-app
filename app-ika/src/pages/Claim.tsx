import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@historiah/ui";
import { ArrowLeft, CheckCircle, Loader2, AlertTriangle, Wallet } from "lucide-react";
import { getChallenge, claimVault, personalSign, connectEthWallet } from "@/services/api";

interface Vault {
  estateId: string;
  label: string;
  ethDepositAddress: string;
  heartbeatInterval: number;
  gracePeriod: number;
  lastHeartbeat: number;
}

export default function Claim() {
  const navigate = useNavigate();
  const [ethAddress, setEthAddress] = useState<string | null>(null);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedEstateId, setSelectedEstateId] = useState("");
  const [step, setStep] = useState<"select" | "challenge" | "sign" | "submit" | "done">("select");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState<{ solana_tx: string; eth_tx: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("heirloom_eth_address");
    if (saved) setEthAddress(saved);
    const vs = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
    setVaults(vs);
    if (vs.length === 1) setSelectedEstateId(vs[0].estateId);
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

  const handleRequestChallenge = async () => {
    if (!selectedEstateId) return;
    setError(null);
    try {
      const resp = await getChallenge(selectedEstateId);
      setChallenge(resp.data.challenge);
      setStep("sign");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSignAndClaim = async () => {
    if (!challenge || !ethAddress || !selectedEstateId) return;
    setClaiming(true);
    setError(null);
    try {
      const sig = await personalSign(challenge);
      setStep("submit");

      const resp = await claimVault({
        estate_id: selectedEstateId,
        heir_eth_address: ethAddress,
        eth_signature: sig,
        challenge,
      });

      setResult({
        solana_tx: resp.data.solana_tx || "",
        eth_tx: resp.data.eth_tx || "",
      });
      setStep("done");

      // Mark vault as claimed locally
      const vs = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
      const idx = vs.findIndex((v: Vault) => v.estateId === selectedEstateId);
      if (idx >= 0) { vs[idx].isClaimed = true; localStorage.setItem("heirloom_vaults", JSON.stringify(vs)); }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("sign");
    } finally {
      setClaiming(false);
    }
  };

  const selectedVault = vaults.find((v) => v.estateId === selectedEstateId);

  if (!ethAddress) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b-4 border-foreground sticky top-0 bg-background z-50">
          <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-16">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 font-bold hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <span className="text-xl font-black">Claim Vault</span>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-16 text-center">
          <Wallet className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-black mb-2">Connect as Heir</h2>
          <p className="text-muted-foreground mb-6">Connect the heir wallet to claim the vault.</p>
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
          <span className="text-xl font-black">Claim Vault</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {step === "done" && result ? (
          <div className="neo-border rounded-2xl bg-card neo-shadow-lg p-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-accent-lime" />
            <h2 className="text-2xl font-black mb-4">Claim Submitted!</h2>
            <p className="text-muted-foreground mb-6">The backend will relay the Solana tx and broadcast the ETH transfer.</p>
            <div className="space-y-2 text-left max-w-lg mx-auto">
              <div><p className="text-xs font-bold uppercase text-muted-foreground">Solana Tx</p>
                <p className="font-mono text-xs break-all neo-border bg-background rounded-lg p-3 mt-1">{result.solana_tx || "N/A"}</p></div>
              <div><p className="text-xs font-bold uppercase text-muted-foreground">ETH Tx</p>
                <p className="font-mono text-xs break-all neo-border bg-background rounded-lg p-3 mt-1">{result.eth_tx || "Pending…"}</p></div>
            </div>
            <Button variant="lime" size="lg" className="mt-6" onClick={() => navigate("/")}>Go to Dashboard</Button>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-black mb-2">Claim Vault</h2>
            <p className="text-muted-foreground mb-6">Sign a challenge with the heir wallet to claim.</p>

            {error && (
              <div className="neo-border bg-accent-red/20 rounded-xl p-4 mb-6">
                <p className="font-bold text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {step === "select" && (
                <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg">
                  <label className="text-xs font-bold uppercase text-muted-foreground block mb-3">Select Vault</label>
                  {vaults.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No vaults found. You can still claim by entering an estate ID manually.</p>
                  ) : (
                    <div className="space-y-2">
                      {vaults.map((v) => (
                        <button key={v.estateId} onClick={() => { setSelectedEstateId(v.estateId); setStep("challenge"); }}
                          className={`w-full text-left neo-border rounded-xl p-4 transition-colors ${selectedEstateId === v.estateId ? "bg-accent-lime" : "bg-background hover:bg-secondary"}`}>
                          <div className="font-bold">{v.label}</div>
                          <div className="text-xs font-mono text-muted-foreground">{v.ethDepositAddress}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {vaults.length === 0 && (
                    <div className="mt-4">
                      <input type="text" value={selectedEstateId} onChange={(e) => setSelectedEstateId(e.target.value)}
                        placeholder="Paste estate ID" className="neo-input w-full font-mono text-sm" />
                      <Button variant="lime" size="sm" className="mt-2" onClick={() => selectedEstateId && setStep("challenge")}>Continue</Button>
                    </div>
                  )}
                </div>
              )}

              {step === "challenge" && selectedVault && (
                <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-accent-yellow neo-border rounded-xl p-2"><AlertTriangle className="h-5 w-5" /></div>
                    <div>
                      <h3 className="text-lg font-black">{selectedVault.label}</h3>
                      <p className="text-xs font-mono text-muted-foreground">{selectedVault.ethDepositAddress}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Request a challenge nonce from the backend. You will sign it with your ETH wallet to prove you are the heir.
                  </p>
                  <Button variant="lime" size="lg" onClick={handleRequestChallenge}>Request Challenge</Button>
                </div>
              )}

              {step === "sign" && challenge && (
                <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg">
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign this challenge with MetaMask. It proves ownership of the heir address.
                  </p>
                  <div className="neo-border bg-background rounded-lg p-3 mb-4">
                    <p className="font-mono text-xs break-all">{challenge}</p>
                  </div>
                  <Button variant="lime" size="lg" onClick={handleSignAndClaim} disabled={claiming}>
                    {claiming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {claiming ? "Claiming…" : "Sign & Claim"}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
