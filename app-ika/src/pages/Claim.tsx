import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@historiah/ui";
import { ArrowLeft, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { getClaimTx, postClaim, signMessageHash } from "@/services/api";
import type { ClaimTxInfo } from "@/services/api";

interface Vault {
  estateId: string;
  label: string;
  ethDepositAddress: string;
  heartbeatInterval: number;
  gracePeriod: number;
  lastHeartbeat: number;
}

function formatWei(wei: string): string {
  try {
    const eth = Number(BigInt(wei)) / 1e18;
    return eth.toFixed(6) + " ETH";
  } catch {
    return wei + " wei";
  }
}

export default function Claim() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedEstateId, setSelectedEstateId] = useState(searchParams.get("estate") || "");
  const [destinationEth, setDestinationEth] = useState("");
  const [step, setStep] = useState<"select" | "preview" | "signing" | "submitting" | "done">("select");
  const [txInfo, setTxInfo] = useState<ClaimTxInfo | null>(null);
  const [result, setResult] = useState<{ solana_tx: string; eth_tx: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const vs = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
    setVaults(vs);
    if (searchParams.get("estate")) setStep("preview");
  }, []);

  const handlePreview = async () => {
    if (!selectedEstateId) return;
    setBusy(true);
    setError(null);
    try {
      const info = await getClaimTx(selectedEstateId);
      setTxInfo(info);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignAndClaim = async () => {
    if (!txInfo || !destinationEth.startsWith("0x")) return;
    setBusy(true);
    setError(null);
    setStep("signing");

    try {
      const sig = await signMessageHash(txInfo.message_hash_hex, destinationEth);

      setStep("submitting");

      const resp = await postClaim({
        estate_id: txInfo.estate_id,
        heir_eth_address: destinationEth,
        eth_signature: sig,
      });

      setResult({ solana_tx: resp.solana_tx, eth_tx: resp.eth_tx });
      setStep("done");

      const vs = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
      const idx = vs.findIndex((v: Vault) => v.estateId === txInfo.estate_id);
      if (idx >= 0) { vs[idx].isClaimed = true; localStorage.setItem("heirloom_vaults", JSON.stringify(vs)); }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("preview");
    } finally {
      setBusy(false);
    }
  };

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
            <p className="text-muted-foreground mb-6">The backend relayed the Solana tx and broadcast the ETH transfer.</p>
            <div className="space-y-2 text-left max-w-lg mx-auto">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Solana Tx</p>
                <p className="font-mono text-xs break-all neo-border bg-background rounded-lg p-3 mt-1">{result.solana_tx || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">ETH Tx</p>
                <p className="font-mono text-xs break-all neo-border bg-background rounded-lg p-3 mt-1">{result.eth_tx || "Pending…"}</p>
              </div>
            </div>
            <Button variant="lime" size="lg" className="mt-6" onClick={() => navigate("/")}>Go to Dashboard</Button>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-black mb-2">Claim Vault</h2>
            <p className="text-muted-foreground mb-6">
              Enter your destination address, then sign the ETH transfer. The backend will relay everything on-chain.
            </p>

            {error && (
              <div className="neo-border bg-accent-red/20 rounded-xl p-4 mb-6">
                <p className="font-bold text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Step 1: Select vault */}
              {step === "select" && (
                <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg">
                  <label className="text-xs font-bold uppercase text-muted-foreground block mb-3">Select Vault</label>
                  {vaults.length > 0 ? (
                    <div className="space-y-2">
                      {vaults.map((v) => (
                        <button
                          key={v.estateId}
                          onClick={() => setSelectedEstateId(v.estateId)}
                          className={`w-full text-left neo-border rounded-xl p-4 transition-colors ${selectedEstateId === v.estateId ? "bg-accent-lime" : "bg-background hover:bg-secondary"}`}
                        >
                          <div className="font-bold">{v.label}</div>
                          <div className="text-xs font-mono text-muted-foreground">{v.ethDepositAddress}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text" value={selectedEstateId}
                      onChange={(e) => setSelectedEstateId(e.target.value)}
                      placeholder="Paste estate ID" className="neo-input w-full font-mono text-sm"
                    />
                  )}
                  <Button
                    variant="lime" size="lg" className="mt-4"
                    disabled={!selectedEstateId || busy}
                    onClick={handlePreview}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {busy ? "Loading…" : "Preview Claim"}
                  </Button>
                </div>
              )}

              {/* Step 2: Preview the ETH transfer, then sign */}
              {(step === "preview" || step === "signing" || step === "submitting") && (
                <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-accent-yellow neo-border rounded-xl p-2"><AlertTriangle className="h-5 w-5" /></div>
                    <h3 className="text-lg font-black">Review Transfer</h3>
                  </div>

                  {!txInfo && (
                    <Button variant="lime" size="lg" disabled={busy} onClick={handlePreview}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Load Transfer Details
                    </Button>
                  )}

                  {txInfo && (
                    <>
                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">From (vault)</span>
                          <span className="font-mono">{txInfo.eth_from.slice(0, 10)}…</span>
                        </div>
                        <div className="flex justify-between font-black">
                          <span>Amount</span>
                          <span className="text-accent-lime">{formatWei(txInfo.amount_wei)}</span>
                        </div>
                      </div>

                      <label className="text-xs font-bold uppercase text-muted-foreground block mb-2">Your Destination Address</label>
                      <input
                        type="text" value={destinationEth}
                        onChange={(e) => setDestinationEth(e.target.value)}
                        placeholder="0x… (where you want the ETH sent)" className="neo-input w-full font-mono text-sm mb-4"
                      />

                      <p className="text-xs text-muted-foreground mb-4">
                        MetaMask will ask you to sign the transaction hash. This authorizes the on-chain claim instruction.
                      </p>

                      <Button
                        variant="lime" size="lg" className="w-full"
                        disabled={busy || !destinationEth.startsWith("0x")}
                        onClick={handleSignAndClaim}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {step === "signing" ? "Sign in MetaMask…"
                          : step === "submitting" ? "Submitting…"
                          : "Sign & Claim"}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
