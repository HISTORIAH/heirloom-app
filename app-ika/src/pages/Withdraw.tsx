import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@historiah/ui";
import {
  ArrowLeft,
  Loader2,
  Shield,
  AlertTriangle,
  Globe,
  Coins,
  Search,
  User,
} from "lucide-react";
import { getWithdrawTx, postWithdraw, signMessageHash } from "@/services/api";
import type { WithdrawTxInfo } from "@/services/api";
import type { Vault } from "@/types";
import { formatWei, isValidEthAddress } from "@/lib/utils";
import { VaultList } from "@/components/VaultList";
import { TxSuccessPage } from "@/components/TxSuccessPage";

type Step = "select" | "preview" | "signing" | "submitting" | "done";

export default function Withdraw() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedEstateId, setSelectedEstateId] = useState(searchParams.get("estate") || "");
  const [destinationEth, setDestinationEth] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [step, setStep] = useState<Step>("select");
  const [txInfo, setTxInfo] = useState<WithdrawTxInfo | null>(null);
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
    if (!selectedEstateId || !isValidEthAddress(destinationEth)) return;
    setBusy(true);
    setError(null);
    try {
      const info = await getWithdrawTx(selectedEstateId, destinationEth);
      setTxInfo(info);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignAndWithdraw = async () => {
    if (!txInfo || !isValidEthAddress(ownerAddress)) return;
    setBusy(true);
    setError(null);
    setStep("signing");

    try {
      const sig = await signMessageHash(txInfo.message_hash_hex, ownerAddress);
      setStep("submitting");

      const resp = await postWithdraw({
        estate_id: txInfo.estate_id,
        destination_eth: destinationEth,
        owner_address: ownerAddress,
        owner_signature: sig,
      });

      setResult({ solana_tx: resp.solana_tx, eth_tx: resp.eth_tx });
      setStep("done");
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
        title="Withdraw"
        icon={<Shield className="h-5 w-5" strokeWidth={3} />}
        heroBadge="Withdrawal Submitted"
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
            <Shield className="h-5 w-5" strokeWidth={3} />
            <span className="text-2xl font-black">Withdraw</span>
          </div>
          <span className="neo-badge bg-accent-yellow text-[10px]">Owner</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 neo-slide-up">
        <div>
          <span className="neo-badge bg-accent-yellow mb-4 inline-block">Owner Exit</span>
          <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
            Pull funds{" "}
            <span className="bg-accent-yellow px-2 inline-block rotate-[-1deg]">back out.</span>
          </h2>
          <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
            Emergency exit as the vault owner. Paste your owner address and destination, then sign
            once with MetaMask.
          </p>
        </div>

        {error && (
          <div className="neo-card-static bg-accent-red/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" strokeWidth={2.5} />
              <div className="min-w-0">
                <p className="font-black">Withdraw error</p>
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
                  Pick a vault and enter the destination + owner addresses.
                </p>
              </div>
            </div>

            <VaultList
              vaults={vaults}
              selectedEstateId={selectedEstateId}
              onSelect={setSelectedEstateId}
              inputAccentClass="focus:bg-accent-yellow/20"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                  Destination Address
                </label>
                <input
                  type="text"
                  value={destinationEth}
                  onChange={(e) => setDestinationEth(e.target.value)}
                  className="neo-input font-mono text-sm focus:bg-accent-yellow/20"
                  placeholder="0x… where to send ETH"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                  Owner Address
                </label>
                <input
                  type="text"
                  value={ownerAddress}
                  onChange={(e) => setOwnerAddress(e.target.value)}
                  className="neo-input font-mono text-sm focus:bg-accent-cyan/20"
                  placeholder="0x… your signing address"
                />
              </div>
            </div>

            <Button
              variant="lime"
              size="lg"
              onClick={handlePreview}
              disabled={
                !selectedEstateId ||
                !isValidEthAddress(destinationEth) ||
                !isValidEthAddress(ownerAddress) ||
                busy
              }
              className="w-full"
            >
              {busy ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Loading…</>
              ) : (
                <><Search className="h-5 w-5" /> Preview Withdrawal</>
              )}
            </Button>
          </div>
        )}

        {(step === "preview" || step === "signing" || step === "submitting") && (
          <div className="neo-card-static space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-accent-pink neo-border rounded-xl p-3">
                <Shield className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-xl font-black">Review Withdrawal</h3>
                <p className="text-sm font-medium text-muted-foreground">
                  Sign the transaction hash with your owner wallet.
                </p>
              </div>
            </div>

            {!txInfo && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                      Destination Address
                    </label>
                    <input
                      type="text"
                      value={destinationEth}
                      onChange={(e) => setDestinationEth(e.target.value)}
                      className="neo-input font-mono text-sm focus:bg-accent-yellow/20"
                      placeholder="0x…"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                      Owner Address
                    </label>
                    <input
                      type="text"
                      value={ownerAddress}
                      onChange={(e) => setOwnerAddress(e.target.value)}
                      className="neo-input font-mono text-sm focus:bg-accent-cyan/20"
                      placeholder="0x…"
                    />
                  </div>
                </div>
                <Button
                  variant="lime"
                  size="lg"
                  disabled={busy || !isValidEthAddress(destinationEth) || !isValidEthAddress(ownerAddress)}
                  onClick={handlePreview}
                  className="w-full"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  Load Transfer Details
                </Button>
              </>
            )}

            {txInfo && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="neo-border rounded-lg p-4 bg-secondary">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      From (vault)
                    </p>
                    <div className="flex items-center gap-1">
                      <Globe className="h-4 w-4" strokeWidth={2.5} />
                      <p className="font-mono text-sm font-bold break-all">{txInfo.eth_from}</p>
                    </div>
                  </div>
                  <div className="neo-border rounded-lg p-4 bg-secondary">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      To (destination)
                    </p>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" strokeWidth={2.5} />
                      <p className="font-mono text-sm font-bold break-all">{txInfo.eth_to}</p>
                    </div>
                  </div>
                  <div className="neo-border rounded-lg p-4 bg-accent-lime/30 md:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Amount
                    </p>
                    <div className="flex items-center gap-1">
                      <Coins className="h-5 w-5" strokeWidth={2.5} />
                      <p className="font-black text-2xl">{formatWei(txInfo.amount_wei)}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs font-medium text-muted-foreground">
                  MetaMask will ask you to sign the transaction hash with{" "}
                  <span className="font-mono font-bold">{ownerAddress.slice(0, 10)}…</span>. This
                  authorizes the on-chain withdraw instruction.
                </p>

                <Button
                  variant="lime"
                  size="xl"
                  className={`w-full ${step === "preview" ? "neo-glow-lime" : ""}`}
                  disabled={busy}
                  onClick={handleSignAndWithdraw}
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {step === "signing"
                    ? "Sign in MetaMask…"
                    : step === "submitting"
                      ? "Submitting…"
                      : "Sign & Withdraw"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
