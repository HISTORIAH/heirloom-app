import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useVault, type Heir } from "@/contexts/VaultContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { explorerTxUrl, SOL_LABEL, USDC_LABEL, SOL_DECIMALS, USDC_DECIMALS } from "@/config/constants";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Heart,
  Clock,
  Shield,
  Coins,
  DollarSign,
  Users,
  CheckCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";

const STEPS = ["Heartbeat", "Heirs", "Deposit", "Review"];

type SubmitState = "idle" | "creating" | "depositing-sol" | "depositing-b" | "complete" | "error";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60 > 0 ? `${seconds % 60}s` : ""}`.trim();
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.round(seconds / 86400);
  return `${d} day${d !== 1 ? "s" : ""}`;
}

const HEARTBEAT_PRESETS = [
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "30d", seconds: 30 * 86400 },
  { label: "60d", seconds: 60 * 86400 },
  { label: "90d", seconds: 90 * 86400 },
  { label: "180d", seconds: 180 * 86400 },
  { label: "365d", seconds: 365 * 86400 },
];

const GRACE_PRESETS = [
  { label: "15s", seconds: 15 },
  { label: "30s", seconds: 30 },
  { label: "7d", seconds: 7 * 86400 },
  { label: "14d", seconds: 14 * 86400 },
  { label: "30d", seconds: 30 * 86400 },
  { label: "60d", seconds: 60 * 86400 },
  { label: "90d", seconds: 90 * 86400 },
];

const CreateVaultPage = () => {
  const { publicKey } = useWallet();
  const { vault, createVaultOnChain, depositSolOnChain, depositUsdcOnChain } = useVault();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0);

  const [heartbeatSeconds, setHeartbeatSeconds] = useState(90 * 86400);
  const [graceSeconds, setGraceSeconds] = useState(30 * 86400);

  const [heirs, setHeirs] = useState<Heir[]>([
    { address: "", label: "Heir 1", splitBps: 10000 },
  ]);

  const [solDeposit, setSolDeposit] = useState(0);
  const [usdcDeposit, setUsdcDeposit] = useState(0);

  const [guardian, setGuardian] = useState("");

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [txId, setTxId] = useState<string | null>(null);

  const totalBps = heirs.reduce((sum, h) => sum + h.splitBps, 0);
  const isHeirsValid = heirs.length > 0 && totalBps === 10000 && heirs.every((h) => h.address.trim().length > 0);

  const heartbeatSliderDays = Math.max(1, Math.round(heartbeatSeconds / 86400));
  const graceSliderDays = Math.max(1, Math.round(graceSeconds / 86400));

  const addHeir = () => {
    if (heirs.length >= 10) return;
    setHeirs([...heirs, { address: "", label: `Heir ${heirs.length + 1}`, splitBps: 0 }]);
  };

  const removeHeir = (idx: number) => {
    if (heirs.length <= 1) return;
    setHeirs(heirs.filter((_, i) => i !== idx));
  };

  const updateHeir = (idx: number, field: keyof Heir, value: string | number) => {
    setHeirs(heirs.map((h, i) => (i === idx ? { ...h, [field]: value } : h)));
  };

  const handleSubmit = async () => {
    try {
      if (!vault) {
        setSubmitState("creating");
        const createTxId = await createVaultOnChain(
          heartbeatSeconds,
          graceSeconds,
          heirs,
          guardian.trim() || undefined
        );
        setTxId(createTxId);
      }

      if (solDeposit > 0) {
        setSubmitState("depositing-sol");
        const rawAmount = Math.round(solDeposit * Math.pow(10, SOL_DECIMALS));
        const depositTxId = await depositSolOnChain(rawAmount);
        setTxId(depositTxId);
      }

      if (usdcDeposit > 0) {
        setSubmitState("depositing-b");
        const rawAmount = Math.round(usdcDeposit * Math.pow(10, USDC_DECIMALS));
        const depositTxId = await depositUsdcOnChain(rawAmount);
        setTxId(depositTxId);
      }

      setSubmitState("complete");
      toast({
        title: vault ? "Deposits Submitted!" : "Vault Created!",
        description: vault ? "Your deposits have been submitted on-chain." : "Your heartbeat vault is live on-chain.",
      });
      setTimeout(() => navigate("/dashboard"), 3000);
    } catch (err: unknown) {
      setSubmitState("error");
      toast({
        title: "Transaction Failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const canProceed = () => {
    if (step === 0) return heartbeatSeconds > 0 && graceSeconds > 0;
    if (step === 1) return isHeirsValid;
    return true;
  };

  if (submitState !== "idle" && submitState !== "error") {
    return (
      <div className="min-h-screen bg-accent-lime flex items-center justify-center p-6">
        <div className="neo-card-static text-center max-w-md w-full neo-slide-up">
          {submitState === "complete" ? (
            <>
              <div className="bg-accent-lime neo-border rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <CheckCircle className="h-10 w-10" strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-black mb-3">Vault Created!</h2>
              <p className="text-lg font-medium text-muted-foreground mb-4">
                Your heartbeat is live. Redirecting to dashboard...
              </p>
            </>
          ) : (
            <>
              <div className="bg-accent-yellow neo-border rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin" strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-black mb-3">
                {submitState === "creating"
                  ? "Creating Vault..."
                  : submitState === "depositing-sol"
                    ? `Depositing ${SOL_LABEL}...`
                    : `Depositing ${USDC_LABEL}...`}
              </h2>
              <p className="text-lg font-medium text-muted-foreground mb-4">
                Confirm the transaction in your wallet
              </p>
              <div className="flex justify-center gap-2 mb-4">
                {["creating", "depositing-sol", "depositing-b"].map((s, i) => {
                  const states = ["creating", "depositing-sol", "depositing-b"];
                  const currentIdx = states.indexOf(submitState);
                  return (
                    <div
                      key={s}
                      className={`w-3 h-3 rounded-full neo-border transition-colors ${
                        i <= currentIdx ? "bg-accent-lime" : "bg-secondary"
                      }`}
                    />
                  );
                })}
              </div>
            </>
          )}
          {txId && (
            <a
              href={explorerTxUrl(txId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 neo-badge bg-background hover:bg-secondary transition-colors"
            >
              View on Explorer <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-8 border-foreground bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-20">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-lg font-black hover:underline group">
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" strokeWidth={3} />
            Back
          </button>
          <span className="text-2xl font-black">Create Vault</span>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : ""}
          </div>
        </div>
      </div>

      <div className="bg-secondary border-b-4 border-foreground">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`neo-step-dot ${i < step ? "complete" : i === step ? "active" : "pending"}`}>
                    {i < step ? <CheckCircle className="h-5 w-5" strokeWidth={3} /> : i + 1}
                  </div>
                  <p className={`text-xs font-bold uppercase tracking-widest mt-2 text-center ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
                    {s}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-1 flex-1 neo-border rounded-full -mt-6 mx-1 ${i < step ? "bg-accent-lime" : "bg-secondary"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="neo-slide-up" key={step}>
          {step === 0 && (
            <div className="space-y-8">
              <div>
                <span className="neo-badge bg-accent-pink mb-4 inline-block">Step 1</span>
                <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                  Set your <span className="bg-accent-pink px-2 inline-block rotate-[-1deg]">heartbeat.</span>
                </h2>
                <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
                  How often will you check in? If you miss a heartbeat, the grace period starts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="neo-card-static">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-accent-pink neo-border rounded-xl p-3"><Heart className="h-6 w-6" strokeWidth={2.5} /></div>
                    <h3 className="text-xl font-black">Heartbeat Interval</h3>
                  </div>
                  <div className="space-y-4">
                    <input type="range" min={1} max={365} value={heartbeatSliderDays} onChange={(e) => setHeartbeatSeconds(Number(e.target.value) * 86400)} className="w-full h-3 bg-secondary neo-border rounded-full appearance-none cursor-pointer accent-accent-pink" />
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{heartbeatSeconds < 86400 ? "Seconds" : "Days"}</span>
                      <span className="text-5xl font-black tabular-nums">{heartbeatSeconds < 86400 ? heartbeatSeconds : Math.round(heartbeatSeconds / 86400)}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {HEARTBEAT_PRESETS.map((p) => (
                        <button key={p.label} onClick={() => setHeartbeatSeconds(p.seconds)} className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] ${heartbeatSeconds === p.seconds ? "bg-accent-pink neo-shadow-sm" : "bg-secondary hover:bg-accent-pink/30"}`}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="neo-card-static">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-accent-yellow neo-border rounded-xl p-3"><Clock className="h-6 w-6" strokeWidth={2.5} /></div>
                    <h3 className="text-xl font-black">Grace Period</h3>
                  </div>
                  <div className="space-y-4">
                    <input type="range" min={1} max={90} value={graceSliderDays} onChange={(e) => setGraceSeconds(Number(e.target.value) * 86400)} className="w-full h-3 bg-secondary neo-border rounded-full appearance-none cursor-pointer accent-accent-yellow" />
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{graceSeconds < 86400 ? "Seconds" : "Days"}</span>
                      <span className="text-5xl font-black tabular-nums">{graceSeconds < 86400 ? graceSeconds : Math.round(graceSeconds / 86400)}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {GRACE_PRESETS.map((p) => (
                        <button key={p.label} onClick={() => setGraceSeconds(p.seconds)} className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] ${graceSeconds === p.seconds ? "bg-accent-yellow neo-shadow-sm" : "bg-secondary hover:bg-accent-yellow/30"}`}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="neo-card-static bg-accent-lime/20">
                <div className="flex items-center gap-3">
                  <div className="bg-accent-lime neo-border rounded-xl p-3 shrink-0"><Clock className="h-5 w-5" strokeWidth={2.5} /></div>
                  <p className="text-base font-bold">
                    Total deadline: <span className="text-2xl font-black">{formatDuration(heartbeatSeconds + graceSeconds)}</span> -- if you don't check in for this long, your heirs can claim.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8">
              <div>
                <span className="neo-badge bg-accent-cyan mb-4 inline-block">Step 2</span>
                <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                  Define your <span className="bg-accent-cyan px-2 inline-block rotate-[1deg]">heirs.</span>
                </h2>
                <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
                  Add up to 10 beneficiaries. Their percentage splits must total exactly 100%.
                </p>
              </div>

              <div className="space-y-4">
                {heirs.map((heir, idx) => (
                  <div key={idx} className="neo-card-static !p-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="bg-foreground text-background neo-border rounded-full w-8 h-8 flex items-center justify-center text-sm font-black shrink-0">{idx + 1}</div>
                    <div className="flex-1 w-full space-y-3 md:space-y-0 md:flex md:gap-4 md:items-center">
                      <div className="flex-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Label</label>
                        <input type="text" value={heir.label} onChange={(e) => updateHeir(idx, "label", e.target.value)} maxLength={50} className="neo-input focus:bg-accent-cyan/20" placeholder="e.g. My Son" />
                      </div>
                      <div className="flex-[2]">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Solana Address</label>
                        <input type="text" value={heir.address} onChange={(e) => updateHeir(idx, "address", e.target.value)} maxLength={128} className="neo-input font-mono text-sm focus:bg-accent-cyan/20" placeholder="Enter Solana wallet address..." />
                      </div>
                      <div className="w-full md:w-28">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Share %</label>
                        <input type="number" min={0} max={100} value={heir.splitBps / 100} onChange={(e) => { const val = Math.min(100, Math.max(0, Number(e.target.value))); updateHeir(idx, "splitBps", val * 100); }} className="neo-input font-black text-xl text-center focus:bg-accent-cyan/20" />
                      </div>
                    </div>
                    <button onClick={() => removeHeir(idx)} disabled={heirs.length <= 1} className="neo-border rounded-lg p-3 bg-accent-red/20 hover:bg-accent-red transition-colors disabled:opacity-30 active:translate-x-[2px] active:translate-y-[2px]">
                      <Trash2 className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <Button variant="outline" onClick={addHeir} disabled={heirs.length >= 10}><Plus className="h-5 w-5" /> Add Heir</Button>
                <div className={`neo-badge transition-colors ${totalBps === 10000 ? "bg-accent-lime" : totalBps > 10000 ? "bg-accent-red neo-shake" : "bg-accent-yellow"}`}>
                  Total: {(totalBps / 100).toFixed(0)}% {totalBps === 10000 ? "\u2713" : totalBps > 10000 ? "Over!" : "-- must be 100%"}
                </div>
              </div>

              <div className="neo-card-static">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-accent-purple neo-border rounded-xl p-3"><Shield className="h-6 w-6" strokeWidth={2.5} /></div>
                  <div>
                    <h3 className="text-xl font-black">Guardian (Optional)</h3>
                    <p className="text-sm font-medium text-muted-foreground">A trusted address that can pause the vault during grace period</p>
                  </div>
                </div>
                <input type="text" value={guardian} onChange={(e) => setGuardian(e.target.value)} maxLength={128} className="neo-input font-mono text-sm focus:bg-accent-purple/20" placeholder="Solana address (leave empty for no guardian)" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div>
                <span className="neo-badge bg-accent-orange mb-4 inline-block">Step 3</span>
                <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                  Fund your <span className="bg-accent-orange px-2 inline-block rotate-[-1deg]">vault.</span>
                </h2>
                <p className="text-lg font-medium text-muted-foreground mt-4 max-w-xl">
                  Deposit tokens into your vault. You can always add more later. This step is optional.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="neo-card-static">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-accent-orange neo-border rounded-xl p-3"><Coins className="h-6 w-6" strokeWidth={2.5} /></div>
                    <div>
                      <h3 className="text-xl font-black">{SOL_LABEL}</h3>
                      <p className="text-sm font-bold text-muted-foreground">Amount ({SOL_DECIMALS} decimals)</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <input type="number" min={0} step={0.0001} value={solDeposit} onChange={(e) => setSolDeposit(Math.max(0, Number(e.target.value)))} className="neo-input font-black text-3xl text-center focus:bg-accent-orange/20 !py-4" />
                    <div className="flex gap-2 flex-wrap">
                      {[0, 0.01, 0.1, 0.5, 1].map((amt) => (
                        <button key={amt} onClick={() => setSolDeposit(amt)} className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] ${solDeposit === amt ? "bg-accent-orange neo-shadow-sm" : "bg-secondary hover:bg-accent-orange/30"}`}>
                          {amt === 0 ? "Skip" : `${amt} ${SOL_LABEL}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="neo-card-static">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-accent-cyan neo-border rounded-xl p-3"><DollarSign className="h-6 w-6" strokeWidth={2.5} /></div>
                    <div>
                      <h3 className="text-xl font-black">{USDC_LABEL}</h3>
                      <p className="text-sm font-bold text-muted-foreground">Amount ({USDC_DECIMALS} decimals)</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <input type="number" min={0} step={1} value={usdcDeposit} onChange={(e) => setUsdcDeposit(Math.max(0, Number(e.target.value)))} className="neo-input font-black text-3xl text-center focus:bg-accent-cyan/20 !py-4" />
                    <div className="flex gap-2 flex-wrap">
                      {[0, 100, 500, 1000, 5000].map((amt) => (
                        <button key={amt} onClick={() => setUsdcDeposit(amt)} className={`neo-border rounded-lg px-3 py-1 text-sm font-bold transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] ${usdcDeposit === amt ? "bg-accent-cyan neo-shadow-sm" : "bg-secondary hover:bg-accent-cyan/30"}`}>
                          {amt === 0 ? "Skip" : `$${amt}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div>
                <span className="neo-badge bg-accent-lime mb-4 inline-block">Step 4</span>
                <h2 className="text-4xl md:text-5xl font-black leading-[0.9]">
                  Review & <span className="bg-accent-lime px-2 inline-block rotate-[1deg]">confirm.</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="neo-card-static">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="h-4 w-4" strokeWidth={2.5} />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Heartbeat</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="font-bold">Interval</span><span className="font-black text-xl">{formatDuration(heartbeatSeconds)}</span></div>
                    <div className="flex justify-between"><span className="font-bold">Grace Period</span><span className="font-black text-xl">{formatDuration(graceSeconds)}</span></div>
                    <div className="flex justify-between border-t-4 border-foreground pt-2 mt-2"><span className="font-bold">Total Deadline</span><span className="font-black text-xl">{formatDuration(heartbeatSeconds + graceSeconds)}</span></div>
                  </div>
                </div>

                <div className="neo-card-static">
                  <div className="flex items-center gap-2 mb-3">
                    <Coins className="h-4 w-4" strokeWidth={2.5} />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Deposits</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="font-bold">{SOL_LABEL}</span><span className="font-black text-xl">{solDeposit > 0 ? solDeposit.toFixed(4) : "None"}</span></div>
                    <div className="flex justify-between"><span className="font-bold">{USDC_LABEL}</span><span className="font-black text-xl">{usdcDeposit > 0 ? `$${usdcDeposit.toFixed(2)}` : "None"}</span></div>
                  </div>
                </div>
              </div>

              <div className="neo-card-static">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" strokeWidth={2.5} />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Heirs ({heirs.length})</h3>
                  </div>
                  <span className="neo-badge bg-accent-lime text-xs">100%</span>
                </div>
                <div className="space-y-3">
                  {heirs.map((h, i) => (
                    <div key={i} className="flex items-center justify-between neo-border rounded-lg p-4 bg-secondary">
                      <div className="flex items-center gap-3">
                        <span className="bg-foreground text-background rounded-full w-7 h-7 flex items-center justify-center text-xs font-black shrink-0">{i + 1}</span>
                        <div>
                          <p className="font-black text-lg">{h.label}</p>
                          <p className="text-xs font-mono text-muted-foreground">{h.address.slice(0, 8)}...{h.address.slice(-6)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-2xl">{(h.splitBps / 100).toFixed(0)}%</p>
                        {solDeposit > 0 && <p className="text-xs font-bold text-muted-foreground">{(solDeposit * h.splitBps / 10000).toFixed(4)} {SOL_LABEL}</p>}
                        {usdcDeposit > 0 && <p className="text-xs font-bold text-muted-foreground">${(usdcDeposit * h.splitBps / 10000).toFixed(2)} {USDC_LABEL}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {guardian && (
                <div className="neo-card-static bg-accent-purple/10">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5" strokeWidth={2.5} />
                    <p className="font-bold">Guardian: <span className="font-mono text-sm">{guardian}</span></p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-12 pt-8 border-t-4 border-foreground">
          <Button variant="outline" size="lg" onClick={() => setStep(step - 1)} disabled={step === 0}>
            <ArrowLeft className="h-5 w-5" /> Back
          </Button>
          {step < 3 ? (
            <Button variant="lime" size="lg" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next <ArrowRight className="h-5 w-5" />
            </Button>
          ) : (
            <Button variant="lime" size="xl" onClick={handleSubmit} disabled={!isHeirsValid} className="neo-glow-lime">
              Create Vault
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateVaultPage;
