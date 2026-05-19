import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  Globe,
  Heart,
  Clock,
  User,
  Fingerprint,
  Copy,
  Shield,
  Check,
} from "lucide-react";
import { createVault } from "@/services/api/vault";
import { registerPasskey } from "@/services/passkey";
import { QRCodeSVG } from "qrcode.react";
import { formatDuration, isValidEthAddress } from "@/lib/utils";

const STEPS = ["Heartbeat", "Owner", "Heir", "Review"];
const LABEL_MAX_LEN = 32;

const HEARTBEAT_PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "365d", days: 365 },
];

const GRACE_PRESETS = [
  { label: "1d", days: 1 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
];

type SubmitState = "idle" | "passkey" | "creating" | "complete" | "error";

interface VaultResult {
  estateId: string;
  estatePda: string;
  ethDepositAddress: string;
  dwalletSolana: string;
}

export default function CreateVault() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);

  // Form fields (mirror existing IKA functionality 1:1)
  const [label, setLabel] = useState("My ETH Vault");
  const [heartbeatDays, setHeartbeatDays] = useState(90);
  const [graceDays, setGraceDays] = useState(30);
  const [ownerAddress, setOwnerAddress] = useState("");
  const [heirEthAddress, setHeirEthAddress] = useState("");

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [result, setResult] = useState<VaultResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const labelValid = label.trim().length > 0 && label.length <= LABEL_MAX_LEN;
  const ownerValid = isValidEthAddress(ownerAddress);
  const heirValid = isValidEthAddress(heirEthAddress);

  const canProceed = () => {
    if (step === 0) return heartbeatDays > 0 && graceDays > 0 && labelValid;
    if (step === 1) return ownerValid;
    if (step === 2) return heirValid;
    return true;
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitState("passkey");

    try {
      const userId = ownerAddress.toLowerCase();
      const passkeyReg = await registerPasskey(userId, label);

      setSubmitState("creating");

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
        label: label.slice(0, LABEL_MAX_LEN),
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
        estatePda: resp.estate_pda,
        ethDepositAddress: resp.eth_deposit_address,
        dwalletSolana: resp.dwallet_solana_address,
      });
      setSubmitState("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitState("error");
    }
  };

  const isWorking = submitState === "passkey" || submitState === "creating";
  const isDone = submitState === "complete" && result;

  // === Done state ===========================================================
  if (isDone && result) {
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
              Dashboard
            </button>
            <span className="text-2xl font-black">Vault Created</span>
            <span className="neo-badge bg-accent-lime text-[10px]">Live</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 neo-slide-up">
          <div className="neo-section-lime neo-border-thick rounded-2xl p-8 neo-shadow-xl text-center">
            <div className="bg-background neo-border rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="h-10 w-10" strokeWidth={2.5} />
            </div>
            <span className="neo-badge bg-background mb-3 inline-block">Vault Live</span>
            <h2 className="text-4xl md:text-5xl font-black uppercase">{label}</h2>
            <p className="text-sm font-bold text-foreground/70 mt-2 max-w-md mx-auto">
              Send ETH to your deposit address to fund the vault. Check in regularly with your passkey.
            </p>
          </div>

          <div className="neo-card-static">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent-orange neo-border rounded-xl p-3">
                <Globe className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black">ETH Deposit Address</h3>
            </div>
            <div className="flex flex-col items-center gap-4 mt-2">
              <div className="neo-border rounded-2xl bg-background p-4">
                <QRCodeSVG value={result.ethDepositAddress} size={180} level="M" />
              </div>
              <p className="font-mono text-sm break-all neo-border bg-background rounded-lg p-3 w-full text-center font-bold">
                {result.ethDepositAddress}
              </p>
              <Button
                variant="outline"
                size="default"
                onClick={() => handleCopy(result.ethDepositAddress)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy Address"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="neo-card-static bg-accent-cyan/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-accent-cyan neo-border rounded-xl p-3">
                  <Fingerprint className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-black">Estate ID</h3>
              </div>
              <p className="font-mono text-xs break-all text-muted-foreground">{result.estateId}</p>
            </div>
            <div className="neo-card-static bg-accent-purple/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-accent-purple neo-border rounded-xl p-3">
                  <Shield className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-black">Ika dWallet</h3>
              </div>
              <p className="font-mono text-xs break-all text-muted-foreground">
                {result.dwalletSolana}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-8 border-t-4 border-foreground">
            <Button variant="lime" size="xl" onClick={() => navigate("/")}>
              Go to Dashboard <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // === Wizard ===============================================================
  return (
    <>
      <div
        className="min-h-screen bg-background"
        aria-hidden={isWorking}
        style={isWorking ? { pointerEvents: "none" } : undefined}
      >
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
            <span className="text-2xl font-black">Create ETH Vault</span>
            <span className="text-lg font-black">IKA</span>
          </div>
        </div>

        <div className="bg-secondary border-b-4 border-foreground">
          <div className="max-w-4xl mx-auto px-6 py-5">
            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`neo-step-dot ${
                        i < step ? "complete" : i === step ? "active" : "pending"
                      }`}
                    >
                      {i < step ? <CheckCircle className="h-5 w-5" strokeWidth={3} /> : i + 1}
                    </div>
                    <p
                      className={`text-xs font-bold uppercase tracking-widest mt-2 text-center ${
                        i === step ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s}
                    </p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`h-1 flex-1 neo-border rounded-full -mt-6 mx-1 ${
                        i < step ? "bg-accent-lime" : "bg-secondary"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-12">
          {error && (
            <div className="neo-card-static bg-accent-red/10 mb-6">
              <p className="font-bold text-sm">{error}</p>
            </div>
          )}

          <div className="neo-slide-up" key={step}>
            {/* Step 0 — Heartbeat + Label */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <span className="neo-badge bg-accent-pink mb-4 inline-block">Step 1</span>
                  <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                    Set your{" "}
                    <span className="bg-accent-pink px-2 inline-block rotate-[-1deg]">
                      heartbeat.
                    </span>
                  </h2>
                  <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
                    How often will you check in with your passkey? Miss it, grace starts.
                  </p>
                </div>

                <div className="neo-card-static">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-accent-yellow neo-border rounded-xl p-3">
                      <Heart className="h-6 w-6" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-black">Label</h3>
                  </div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                    Vault name ({LABEL_MAX_LEN} chars max)
                  </label>
                  <input
                    type="text"
                    value={label}
                    maxLength={LABEL_MAX_LEN}
                    onChange={(e) => setLabel(e.target.value.slice(0, LABEL_MAX_LEN))}
                    className="neo-input focus:bg-accent-yellow/20"
                    placeholder="e.g. My ETH Vault"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="neo-card-static">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-accent-pink neo-border rounded-xl p-3">
                        <Heart className="h-6 w-6" strokeWidth={2.5} />
                      </div>
                      <h3 className="text-xl font-black">Heartbeat Interval</h3>
                    </div>
                    <div className="space-y-4">
                      <input
                        type="range"
                        min={1}
                        max={365}
                        value={heartbeatDays}
                        onChange={(e) => setHeartbeatDays(Number(e.target.value))}
                        className="w-full h-3 bg-secondary neo-border rounded-full appearance-none cursor-pointer accent-accent-pink"
                      />
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                          Days
                        </span>
                        <span className="text-5xl font-black tabular-nums">{heartbeatDays}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {HEARTBEAT_PRESETS.map((p) => (
                          <button
                            key={p.label}
                            onClick={() => setHeartbeatDays(p.days)}
                            className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] ${
                              heartbeatDays === p.days
                                ? "bg-accent-pink neo-shadow-sm"
                                : "bg-secondary hover:bg-accent-pink/30"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="neo-card-static">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-accent-yellow neo-border rounded-xl p-3">
                        <Clock className="h-6 w-6" strokeWidth={2.5} />
                      </div>
                      <h3 className="text-xl font-black">Grace Period</h3>
                    </div>
                    <div className="space-y-4">
                      <input
                        type="range"
                        min={1}
                        max={90}
                        value={graceDays}
                        onChange={(e) => setGraceDays(Number(e.target.value))}
                        className="w-full h-3 bg-secondary neo-border rounded-full appearance-none cursor-pointer accent-accent-yellow"
                      />
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                          Days
                        </span>
                        <span className="text-5xl font-black tabular-nums">{graceDays}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {GRACE_PRESETS.map((p) => (
                          <button
                            key={p.label}
                            onClick={() => setGraceDays(p.days)}
                            className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] ${
                              graceDays === p.days
                                ? "bg-accent-yellow neo-shadow-sm"
                                : "bg-secondary hover:bg-accent-yellow/30"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="neo-card-static bg-accent-lime/30 flex items-center gap-4">
                  <div className="bg-accent-lime neo-border rounded-xl p-3 shrink-0">
                    <Clock className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <p className="text-base font-bold leading-snug">
                    Total protection window:{" "}
                    <span className="text-xl font-black">
                      {formatDuration((heartbeatDays + graceDays) * 86400)}
                    </span>
                    {" "}— if you don't check in for this long, your heir can claim.
                  </p>
                </div>
              </div>
            )}

            {/* Step 1 — Owner */}
            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <span className="neo-badge bg-accent-cyan mb-4 inline-block">Step 2</span>
                  <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                    Your{" "}
                    <span className="bg-accent-cyan px-2 inline-block rotate-[1deg]">
                      owner address.
                    </span>
                  </h2>
                  <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
                    Your Ethereum address — used for emergency withdrawals and passkey registration.
                  </p>
                </div>

                <div className="neo-card-static">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-accent-cyan neo-border rounded-xl p-3">
                      <Globe className="h-6 w-6" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-black">Owner ETH Address</h3>
                  </div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                    0x address you control
                  </label>
                  <input
                    type="text"
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                    maxLength={64}
                    className="neo-input font-mono text-sm focus:bg-accent-cyan/20"
                    placeholder="0x..."
                  />
                  <p className="text-xs font-medium text-muted-foreground mt-2">
                    You sign with this address in MetaMask if you ever need to pull funds back out.
                  </p>
                </div>

                <div className="neo-card-static bg-secondary/50">
                  <div className="flex items-start gap-3">
                    <Fingerprint className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-bold text-sm">Passkey required</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        On the review step your device will ask for biometric verification to bind a
                        passkey to this vault. No Solana wallet needed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Heir */}
            {step === 2 && (
              <div className="space-y-8">
                <div>
                  <span className="neo-badge bg-accent-orange mb-4 inline-block">Step 3</span>
                  <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                    Name your{" "}
                    <span className="bg-accent-orange px-2 inline-block rotate-[-1deg]">heir.</span>
                  </h2>
                  <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
                    The Ethereum address that receives ETH if you stop checking in.
                  </p>
                </div>

                <div className="neo-card-static">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-accent-orange neo-border rounded-xl p-3">
                      <User className="h-6 w-6" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-black">Heir ETH Address</h3>
                  </div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                    Where ETH goes when claimed
                  </label>
                  <input
                    type="text"
                    value={heirEthAddress}
                    onChange={(e) => setHeirEthAddress(e.target.value)}
                    maxLength={64}
                    className="neo-input font-mono text-sm focus:bg-accent-orange/20"
                    placeholder="0x..."
                  />
                  <p className="text-xs font-medium text-muted-foreground mt-2">
                    One vault, one heir. Create more vaults to cover more beneficiaries.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3 — Review */}
            {step === 3 && (
              <div className="space-y-8">
                <div>
                  <span className="neo-badge bg-accent-lime mb-4 inline-block">Step 4</span>
                  <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                    Review &{" "}
                    <span className="bg-accent-lime px-2 inline-block rotate-[1deg]">confirm.</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="neo-card-static">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      Timing
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-bold">Interval</span>
                        <span className="font-black text-xl">
                          {formatDuration(heartbeatDays * 86400)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold">Grace</span>
                        <span className="font-black text-xl">
                          {formatDuration(graceDays * 86400)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t-4 border-foreground pt-2 mt-2">
                        <span className="font-bold">Total</span>
                        <span className="font-black text-xl">
                          {formatDuration((heartbeatDays + graceDays) * 86400)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="neo-card-static">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      Identity
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          Label
                        </p>
                        <p className="font-black text-lg">{label}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          Network
                        </p>
                        <p className="font-black text-lg">Ethereum</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="neo-card-static">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-accent-cyan neo-border rounded-xl p-3">
                      <Globe className="h-6 w-6" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-black">Owner</h3>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground break-all">{ownerAddress}</p>
                </div>

                <div className="neo-card-static">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-accent-orange neo-border rounded-xl p-3">
                      <User className="h-6 w-6" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-black">Heir</h3>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {heirEthAddress}
                  </p>
                </div>

                <div className="neo-card-static bg-accent-purple/10">
                  <div className="flex items-start gap-3">
                    <div className="bg-accent-purple neo-border rounded-xl p-3 shrink-0">
                      <Fingerprint className="h-6 w-6 text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="font-black">Passkey will be created</p>
                      <p className="text-sm font-medium text-muted-foreground mt-1">
                        Your device will prompt for biometric verification. The passkey signs every
                        heartbeat — no Solana wallet, no seed phrase.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-12 pt-8 border-t-4 border-foreground">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setStep(step - 1)}
              disabled={step === 0 || isWorking}
            >
              <ArrowLeft className="h-5 w-5" /> Back
            </Button>
            {step < 3 ? (
              <Button
                variant="lime"
                size="lg"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed() || isWorking}
              >
                Next <ArrowRight className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                variant="lime"
                size="xl"
                onClick={handleSubmit}
                disabled={!labelValid || !ownerValid || !heirValid || isWorking}
                className="neo-glow-lime"
              >
                {isWorking ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                    Creating…
                  </>
                ) : (
                  <>
                    <Globe className="h-5 w-5" /> Create Vault
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {isWorking && (
        <div
          role="dialog"
          aria-modal="true"
          aria-live="polite"
          className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-6"
        >
          <div className="neo-card-static text-center max-w-md w-full neo-slide-up">
            {submitState === "passkey" ? (
              <>
                <div className="bg-accent-cyan neo-border rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Fingerprint className="h-10 w-10" strokeWidth={2.5} />
                </div>
                <h2 className="text-3xl font-black mb-3">Register Passkey</h2>
                <p className="text-lg font-medium text-muted-foreground mb-4">
                  Use your device biometric or PIN to create the passkey.
                </p>
              </>
            ) : (
              <>
                <div className="bg-accent-yellow neo-border rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin" strokeWidth={2.5} />
                </div>
                <h2 className="text-3xl font-black mb-3">Creating Vault…</h2>
                <p className="text-lg font-medium text-muted-foreground mb-4">
                  Running Ika DKG and submitting on-chain. May take 30–60 seconds.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
