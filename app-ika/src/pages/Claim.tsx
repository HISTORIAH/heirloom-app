import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Gift,
  Search,
  Coins,
  User,
} from "lucide-react";
import { getClaimTx, postClaim } from "@/services/api/claim";
import type { ClaimTxInfo } from "@/types/api";
import { signMessageHash } from "@/services/ethereum";
import type { Vault } from "@/types";
import { formatWei, isValidEthAddress } from "@/lib/utils";
import { VaultList } from "@/components/VaultList";
import { TxSuccessPage } from "@/components/TxSuccessPage";

type Step = "select" | "preview" | "signing" | "submitting" | "done";

export default function Claim() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedEstateId, setSelectedEstateId] = useState(searchParams.get("estate") || "");
  const [destinationEth, setDestinationEth] = useState("");
  const [step, setStep] = useState<Step>("select");
  const [txInfo, setTxInfo] = useState<ClaimTxInfo | null>(null);
  const [result, setResult] = useState<{ solana_tx: string; eth_tx: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const vs = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
    setVaults(vs);
    if (searchParams.get("estate")) setStep("preview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!txInfo || !isValidEthAddress(destinationEth)) return;
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
      if (idx >= 0) {
        vs[idx].isClaimed = true;
        localStorage.setItem("heirloom_vaults", JSON.stringify(vs));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("preview");
    } finally {
      setBusy(false);
    }
  };

  if (step === "done" && result) {
    return (
      <TxSuccessPage
        title="Claim"
        icon={<Gift className="h-5 w-5" strokeWidth={3} />}
        heroBadge="Claim Submitted"
        solanaTx={result.solana_tx}
        ethTx={result.eth_tx}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-8 border-foreground bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-20">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-lg font-black hover:underline group"
          >
            <ArrowLeft
              className="h-5 w-5 transition-transform group-hover:-translate-x-1"
              strokeWidth={3}
            />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5" strokeWidth={3} />
            <span className="text-2xl font-black">Claim</span>
          </div>
          <span className="neo-badge bg-accent-orange text-[10px]">Heir</span>
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
            Pick the vault or paste its estate ID, sign once with MetaMask, and the backend relays
            the rest.
          </p>
        </div>

        {error && (
          <div className="neo-card-static bg-accent-red/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" strokeWidth={2.5} />
              <div className="min-w-0">
                <p className="font-black">Claim error</p>
                <p className="text-sm font-medium text-muted-foreground break-words">{error}</p>
              </div>
            </div>
          </div>
        )}

        {step === "select" && (
          <div className="neo-card-static space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-accent-cyan neo-border rounded-xl p-3">
                <Search className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-xl font-black">Select Vault</h3>
                <p className="text-sm font-medium text-muted-foreground">
                  Choose a locally-known vault, or paste an estate ID directly.
                </p>
              </div>
            </div>

            <VaultList
              vaults={vaults}
              selectedEstateId={selectedEstateId}
              onSelect={setSelectedEstateId}
              inputAccentClass="focus:bg-accent-orange/20"
            />

            <div className="pt-2">
              <Button
                variant="lime"
                size="lg"
                onClick={handlePreview}
                disabled={!selectedEstateId || busy}
                className="w-full"
              >
                {busy ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Loading…</>
                ) : (
                  <><Search className="h-5 w-5" /> Preview Claim</>
                )}
              </Button>
            </div>
          </div>
        )}

        {(step === "preview" || step === "signing" || step === "submitting") && (
          <div className="neo-card-static space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-accent-yellow neo-border rounded-xl p-3">
                <AlertTriangle className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-xl font-black">Review Transfer</h3>
                <p className="text-sm font-medium text-muted-foreground">
                  Sign the transaction hash with your MetaMask wallet.
                </p>
              </div>
            </div>

            {!txInfo && (
              <Button variant="lime" size="lg" disabled={busy} onClick={handlePreview}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Load Transfer Details
              </Button>
            )}

            {txInfo && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="neo-border rounded-lg p-4 bg-secondary">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      From (vault)
                    </p>
                    <p className="font-mono text-sm font-bold break-all">{txInfo.eth_from}</p>
                  </div>
                  <div className="neo-border rounded-lg p-4 bg-accent-lime/30">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Amount
                    </p>
                    <div className="flex items-center gap-1">
                      <Coins className="h-5 w-5" strokeWidth={2.5} />
                      <p className="font-black text-xl">{formatWei(txInfo.amount_wei)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                    Your Destination Address
                  </label>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4" strokeWidth={2.5} />
                    <input
                      type="text"
                      value={destinationEth}
                      onChange={(e) => setDestinationEth(e.target.value)}
                      className="neo-input font-mono text-sm focus:bg-accent-orange/20"
                      placeholder="0x… where you want the ETH sent"
                    />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Your wallet provider will ask you to sign the transaction hash. This authorizes
                    the on-chain claim instruction.
                  </p>
                </div>

                <Button
                  variant="lime"
                  size="xl"
                  className={`w-full ${step === "preview" ? "neo-glow-lime" : ""}`}
                  disabled={busy || !isValidEthAddress(destinationEth)}
                  onClick={handleSignAndClaim}
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {step === "signing"
                    ? "Sign in MetaMask…"
                    : step === "submitting"
                      ? "Submitting…"
                      : "Sign & Claim"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
