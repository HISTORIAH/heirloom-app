import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { useWalletSplTokens } from "@/hooks/useWalletSplTokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import TokenAvatar from "@/components/TokenAvatar";
import { SOL_DECIMALS, SOL_LABEL } from "@/config/constants";
import { cn, errMsg } from "@/lib/utils";
import { Loader2, TrendingUp } from "lucide-react";

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const PCTS = [25, 50, 75, 100] as const;

const TopUpSection: React.FC<Props> = ({ estate, onTx }) => {
  const { depositSolOnChain, depositTokenOnChain, fetchEstates } = useVault();
  const { publicKey, isConnected } = useWallet();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [selectedMint, setSelectedMint] = useState<"sol" | string>("sol");
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const vaultMints = estate.vaultTokens.map((vt) => vt.mint);
  const { metadata: tokenMeta } = useTokenMetadata(vaultMints);
  const { data: walletSplTokens } = useWalletSplTokens(isConnected && open ? publicKey : null);
  const { sol: walletSolBalance } = useTokenBalances(isConnected && open ? publicKey : null);

  const selectedHolding = useMemo(
    () => estate.vaultTokens.find((vt) => vt.mint === selectedMint),
    [estate.vaultTokens, selectedMint],
  );

  const walletTokenBalance = useMemo(
    () => walletSplTokens?.find((t) => t.mint === selectedMint),
    [walletSplTokens, selectedMint],
  );

  const maxBalance = selectedMint === "sol" ? walletSolBalance : (walletTokenBalance?.uiAmount ?? 0);
  const decimals = selectedMint === "sol" ? SOL_DECIMALS : (selectedHolding?.decimals ?? 0);
  const step = 1 / Math.pow(10, Math.min(6, decimals));

  const applyPct = (pct: number) => {
    const raw = (maxBalance * pct) / 100;
    setAmount(Math.floor(raw / step) * step);
  };

  const handleTopUp = async () => {
    if (amount <= 0) return;
    setLoading(true);
    try {
      let tx: string;
      if (selectedMint === "sol") {
        tx = await depositSolOnChain(estate.vaultPda, BigInt(Math.round(amount * Math.pow(10, SOL_DECIMALS))));
      } else {
        if (!selectedHolding) throw new Error("Token not found in vault");
        tx = await depositTokenOnChain(selectedHolding, BigInt(Math.round(amount * Math.pow(10, selectedHolding.decimals))));
      }
      onTx(tx);
      setOpen(false);
      setAmount(0);
      toast({ title: "Top-up sent", description: "Funds added to the vault." });
      await fetchEstates();
    } catch (err: unknown) {
      toast({ title: "Top-up failed", description: errMsg(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (estate.vaultTokens.length === 0 && estate.solBalance === 0) return null;

  return (
    <div className="neo-card-static">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="bg-accent-lime neo-border rounded-xl p-3">
            <TrendingUp className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <h3 className="font-black text-lg">Top Up</h3>
            <p className="text-sm font-medium text-muted-foreground">Add more to an existing vault asset.</p>
          </div>
        </div>
        <span className="text-2xl font-black">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="space-y-4 mt-4 pt-4 border-t-2 border-foreground/10">

          {/* Asset picker */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">
              Asset
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {/* SOL option */}
              <button
                onClick={() => { setSelectedMint("sol"); setAmount(0); }}
                className={cn(
                  "flex items-center gap-2 neo-border rounded-xl px-4 py-2.5 font-bold text-sm transition-colors w-full min-w-0",
                  selectedMint === "sol" ? "bg-accent-lime" : "bg-secondary hover:bg-secondary/70",
                )}
              >
                <TokenAvatar label={SOL_LABEL} size="sm" accent="bg-accent-orange" />
                <span className="truncate">{SOL_LABEL}</span>
              </button>

              {/* Token options */}
              {estate.vaultTokens.map((vt) => {
                const meta = tokenMeta.get(vt.mint);
                const label = meta?.symbol || meta?.name || `${vt.mint.slice(0, 4)}…${vt.mint.slice(-4)}`;
                return (
                  <button
                    key={vt.mint}
                    onClick={() => { setSelectedMint(vt.mint); setAmount(0); }}
                    className={cn(
                      "flex items-center gap-2 neo-border rounded-xl px-4 py-2.5 font-bold text-sm transition-colors w-full min-w-0",
                      selectedMint === vt.mint ? "bg-accent-lime" : "bg-secondary hover:bg-secondary/70",
                    )}
                  >
                    <TokenAvatar image={meta?.image} label={label} size="sm" accent="bg-accent-cyan" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Amount
              </label>
              <span className="text-[11px] font-medium text-muted-foreground">
                {selectedMint === "sol"
                  ? `Max: ${walletSolBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${SOL_LABEL}`
                  : walletTokenBalance
                    ? `Max: ${walletTokenBalance.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${walletTokenBalance.label}`
                    : ""}
              </span>
            </div>
            <input
              type="number"
              min={0}
              step={step}
              value={amount || ""}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="0"
              className="neo-input w-full font-black text-2xl text-center"
            />

            {/* Percentage quick-fill — visible on input focus */}
            <div className={cn(
              "grid grid-cols-4 gap-2 mt-2 transition-all duration-150",
              inputFocused ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none h-0 mt-0 overflow-hidden",
            )}>
              {PCTS.map((pct) => (
                <button
                  key={pct}
                  onMouseDown={(e) => { e.preventDefault(); applyPct(pct); }}
                  className="neo-border rounded-lg py-1.5 text-xs font-black uppercase tracking-wide bg-secondary hover:bg-accent-lime transition-colors"
                >
                  {pct === 100 ? "Max" : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="lime"
            size="default"
            onClick={handleTopUp}
            disabled={loading || amount <= 0}
            className="w-full"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
              : <><TrendingUp className="h-4 w-4" /> Top Up</>
            }
          </Button>
        </div>
      )}
    </div>
  );
};

export default TopUpSection;
