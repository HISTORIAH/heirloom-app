import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@historiah/ui";
import { ArrowLeft, CheckCircle, Loader2, Globe, Heart, Clock, User, Fingerprint, Copy } from "lucide-react";
import { createVault } from "@/services/api";
import { registerPasskey } from "@/services/passkey";
import { QRCodeSVG } from "qrcode.react";

function formatDuration(seconds: number): string {
  const d = Math.round(seconds / 86400);
  return `${d} day${d !== 1 ? "s" : ""}`;
}

interface VaultResult {
  estateId: string;
  ethDepositAddress: string;
  dwalletSolana: string;
}

export default function CreateVault() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "passkey" | "creating" | "done">("form");
  const [result, setResult] = useState<VaultResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [label, setLabel] = useState("My ETH Vault");
  const [heartbeatDays, setHeartbeatDays] = useState(90);
  const [graceDays, setGraceDays] = useState(30);
  const [heirEthAddress, setHeirEthAddress] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback ignored
    }
  };

  const handleSubmit = async () => {
    if (!ownerAddress.startsWith("0x") || !heirEthAddress.startsWith("0x")) {
      setError("Both owner and heir addresses must be valid Ethereum addresses (0x…).");
      return;
    }
    setError(null);
    setSubmitting(true);
    setStep("passkey");

    try {
      const userId = ownerAddress.toLowerCase();
      const passkeyReg = await registerPasskey(userId, label);

      setStep("creating");

      const stored = JSON.parse(localStorage.getItem("heirloom_credentials") || "{}");
      stored[ownerAddress.toLowerCase()] = passkeyReg.credentialId;
      localStorage.setItem("heirloom_credentials", JSON.stringify(stored));

      const resp = await createVault({
        heir_eth_address: heirEthAddress.trim(),
        owner_address: ownerAddress,
        passkey_pubkey_hex: passkeyReg.pubkeyHex,
        network_id: 0,
        heartbeat_interval_secs: heartbeatDays * 86400,
        grace_period_secs: graceDays * 86400,
        pause_duration_secs: graceDays * 86400,
        label: label.slice(0, 32),
      });

      const vaults = JSON.parse(localStorage.getItem("heirloom_vaults") || "[]");
      vaults.push({
        estateId: resp.estate_id,
        estatePda: resp.estate_pda,
        label,
        ethDepositAddress: resp.eth_deposit_address,
        dwalletSolana: resp.dwallet_solana_address,
        heartbeatInterval: heartbeatDays * 86400,
        gracePeriod: graceDays * 86400,
        lastHeartbeat: Math.floor(Date.now() / 1000),
        isClaimed: false,
      });
      localStorage.setItem("heirloom_vaults", JSON.stringify(vaults));

      setResult({
        estateId: resp.estate_id,
        ethDepositAddress: resp.eth_deposit_address,
        dwalletSolana: resp.dwallet_solana_address,
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "done" && result) {
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
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="neo-border rounded-2xl bg-card neo-shadow-lg p-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-accent-lime" />
            <h2 className="text-2xl font-black mb-2">Vault Created!</h2>
            <p className="text-muted-foreground mb-6">Send ETH to this address to fund your vault. Check in regularly with your passkey.</p>
            <div className="space-y-4 text-left max-w-lg mx-auto">
              <div className="flex flex-col items-center gap-3">
                <QRCodeSVG value={result.ethDepositAddress} size={160} level="M" />
                <p className="font-mono text-sm break-all neo-border bg-background rounded-lg p-3 w-full text-center">
                  {result.ethDepositAddress}
                </p>
                <Button variant="outline" size="sm" onClick={() => handleCopy(result.ethDepositAddress)}>
                  <Copy className="h-4 w-4 mr-1" /> {copied ? "Copied!" : "Copy Address"}
                </Button>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Estate ID</p>
                <p className="font-mono text-xs break-all neo-border bg-background rounded-lg p-3 mt-1 opacity-70">{result.estateId}</p>
              </div>
            </div>
            <Button variant="lime" size="lg" className="mt-6" onClick={() => navigate("/")}>Go to Dashboard</Button>
          </div>
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
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-3xl font-black mb-2">Create Vault</h2>
        <p className="text-muted-foreground mb-6">
          Set up an ETH vault backed by Ika MPC. Your heir can claim if you stop checking in with your passkey.
        </p>

        {error && (
          <div className="neo-border bg-accent-red/20 rounded-xl p-4 mb-6">
            <p className="font-bold text-sm">{error}</p>
          </div>
        )}

        {(step === "passkey" || step === "creating") && (
          <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg text-center mb-6">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-accent-lime" />
            {step === "passkey" && (
              <>
                <p className="font-black text-lg">Register Passkey</p>
                <p className="text-sm text-muted-foreground mt-1">Use your device biometric or PIN to create a passkey.</p>
              </>
            )}
            {step === "creating" && (
              <>
                <p className="font-black text-lg">Creating Vault…</p>
                <p className="text-sm text-muted-foreground mt-1">Running DKG and submitting on-chain. This may take 30–60 seconds.</p>
              </>
            )}
          </div>
        )}

        <div className="space-y-6">
          <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg">
            <label className="text-xs font-bold uppercase text-muted-foreground block mb-2">Label</label>
            <input
              type="text" value={label} maxLength={32}
              onChange={(e) => setLabel(e.target.value.slice(0, 32))}
              className="neo-input w-full" disabled={submitting}
            />
          </div>

          <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent-pink neo-border rounded-xl p-2"><Heart className="h-5 w-5" /></div>
              <h3 className="text-lg font-black">Heartbeat Interval</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">How often you must check in with your passkey.</p>
            <input type="range" min={7} max={365} value={heartbeatDays}
              onChange={(e) => setHeartbeatDays(Number(e.target.value))} className="w-full" disabled={submitting} />
            <div className="text-3xl font-black mt-2">{heartbeatDays}d</div>
          </div>

          <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent-yellow neo-border rounded-xl p-2"><Clock className="h-5 w-5" /></div>
              <h3 className="text-lg font-black">Grace Period</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Extra time after heartbeat lapses before your heir can claim.</p>
            <input type="range" min={1} max={90} value={graceDays}
              onChange={(e) => setGraceDays(Number(e.target.value))} className="w-full" disabled={submitting} />
            <div className="text-3xl font-black mt-2">{graceDays}d</div>
          </div>

          <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent-cyan neo-border rounded-xl p-2"><User className="h-5 w-5" /></div>
              <h3 className="text-lg font-black">Heir ETH Address</h3>
            </div>
            <input type="text" value={heirEthAddress}
              onChange={(e) => setHeirEthAddress(e.target.value)}
              placeholder="0x..." className="neo-input w-full font-mono text-sm" disabled={submitting} />
            <p className="text-xs text-muted-foreground mt-2">Where ETH goes if you stop checking in.</p>
          </div>

          <div className="neo-border rounded-2xl p-6 bg-card neo-shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent-lime neo-border rounded-xl p-2"><Globe className="h-5 w-5" /></div>
              <h3 className="text-lg font-black">Owner ETH Address</h3>
            </div>
            <input type="text" value={ownerAddress}
              onChange={(e) => setOwnerAddress(e.target.value)}
              placeholder="0x... (your address for withdrawals)" className="neo-input w-full font-mono text-sm" disabled={submitting} />
            <p className="text-xs text-muted-foreground mt-2">Your address for withdrawals and passkey registration.</p>
          </div>

          <div className="neo-border rounded-xl p-4 bg-accent-lime neo-shadow-md">
            <p className="font-bold">Total protection window: <span className="text-xl font-black">{formatDuration((heartbeatDays + graceDays) * 86400)}</span></p>
          </div>

          <div className="neo-border rounded-2xl p-4 bg-secondary/50">
            <div className="flex items-center gap-2 mb-1">
              <Fingerprint className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-bold">Passkey required</span>
            </div>
            <p className="text-xs text-muted-foreground">
              After clicking Create, your device will ask for biometric verification to register your passkey. This key is used on-chain to verify heartbeats — no Solana wallet needed.
            </p>
          </div>

          <Button variant="lime" size="lg" className="w-full"
            disabled={submitting || !heirEthAddress.startsWith("0x") || !ownerAddress.startsWith("0x")}
            onClick={handleSubmit}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
            {submitting ? "Working…" : "Create Vault"}
          </Button>
        </div>
      </main>
    </div>
  );
}
