import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { useWalletSplTokens } from "@/hooks/useWalletSplTokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { cn, errMsg, toRawTokenAmount } from "@/lib/utils";
import { TOPUP_PCTS, amountStep, pctOfMax } from "@/lib/amountInput";
import { Loader2, Plus } from "lucide-react";
import { SOL_DECIMALS, SOL_LABEL } from "@/lib/constants";

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const AddAssetSection: React.FC<Props> = ({ estate, onTx }) => {
  const { registerAssetOnChain, registerSolOnChain, fetchEstates } = useVault();
  const { publicKey, isConnected } = useWallet();
  const { toast } = useToast();

  const [showAddAsset, setShowAddAsset] = useState(false);
  const [addAssetMint, setAddAssetMint] = useState<"sol" | string>("sol");
  const [addAssetAmount, setAddAssetAmount] = useState<number>(0);
  const [addingAsset, setAddingAsset] = useState(false);

  const { data: allWalletSplTokens, isLoading: walletTokensLoading } = useWalletSplTokens(
    isConnected && showAddAsset ? publicKey : null,
  );

  const vaultMintSet = useMemo(
    () => new Set(estate.vaultTokens.map((vt) => vt.mint)),
    [estate.vaultTokens],
  );

  const walletSplTokens = useMemo(
    () => (allWalletSplTokens ?? []).filter((t) => !vaultMintSet.has(t.mint)),
    [allWalletSplTokens, vaultMintSet],
  );
  const { sol: walletSolBalance } = useTokenBalances(
    isConnected && showAddAsset ? publicKey : null,
  );
  const selectedToken = useMemo(
    () => (walletSplTokens ?? []).find((t) => t.mint === addAssetMint),
    [walletSplTokens, addAssetMint],
  );

  const activeDecimals = addAssetMint === "sol" ? SOL_DECIMALS : (selectedToken?.decimals ?? 9);
  const activeStep = amountStep(activeDecimals);
  const maxBalance = addAssetMint === "sol" ? walletSolBalance : (selectedToken?.uiAmount ?? 0);

  const applyPct = (pct: number) => {
    setAddAssetAmount(pctOfMax(maxBalance, pct, activeStep));
  };

  const handleAddAsset = async () => {
    if (addAssetAmount <= 0) return;
    setAddingAsset(true);
    try {
      let tx: string;
      if (addAssetMint === "sol") {
        const lamports = toRawTokenAmount(addAssetAmount, SOL_DECIMALS);
        if (lamports <= 0n) throw new Error("Amount must be greater than zero");
        tx = await registerSolOnChain(estate.heir, lamports);
      } else {
        if (!selectedToken) throw new Error("Token not found in wallet");
        const amount = toRawTokenAmount(addAssetAmount, selectedToken.decimals);
        if (amount <= 0n) throw new Error("Amount must be greater than zero");
        tx = await registerAssetOnChain(estate.heir, {
          mint: addAssetMint,
          amount,
          decimals: selectedToken.decimals,
          tokenProgram: selectedToken.tokenProgram,
        });
      }
      onTx(tx);
      setShowAddAsset(false);
      setAddAssetAmount(0);
      toast({ title: "Asset added", description: "Funds deposited into the vault." });
      await fetchEstates();
    } catch (err: unknown) {
      toast({
        title: "Add asset failed",
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setAddingAsset(false);
    }
  };

  return (
    <div className="neo-card-static">
      <button
        onClick={() => setShowAddAsset(!showAddAsset)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-3">
          <div className="bg-accent-orange neo-border rounded-xl p-3">
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <h3 className="font-black text-lg">Register New Asset</h3>
            <p className="text-sm font-medium text-muted-foreground">
              Add a new token type to this vault.
            </p>
          </div>
        </div>
        <span className="text-2xl font-black">{showAddAsset ? "−" : "+"}</span>
      </button>
      {showAddAsset && (
        <div className="space-y-4 mt-4 pt-4 border-t-2 border-foreground/10">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">
              Asset
            </label>
            <select
              value={addAssetMint}
              onChange={(e) => {
                setAddAssetMint(e.target.value);
                setAddAssetAmount(0);
              }}
              className="neo-input w-full font-bold"
            >
              <option value="sol">{SOL_LABEL}</option>
              {(walletSplTokens ?? []).map((t) => (
                <option key={t.mint} value={t.mint}>
                  {t.label} — bal {t.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </option>
              ))}
            </select>
            {walletTokensLoading && (
              <p className="text-[11px] font-medium text-muted-foreground mt-1">
                Scanning wallet for SPL tokens…
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">
              Amount
            </label>
            <input
              type="number"
              min={0}
              step={activeStep}
              value={addAssetAmount || ""}
              onChange={(e) => setAddAssetAmount(Math.max(0, Number(e.target.value)))}
              placeholder="0"
              className="neo-input w-full font-black text-2xl text-center"
            />
            <div className="flex gap-2 mt-3">
              {TOPUP_PCTS.map(({ pct, label, bg }) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyPct(pct)}
                  disabled={maxBalance <= 0}
                  className={cn(
                    "flex-1 neo-border rounded-lg py-3 text-xs font-black uppercase tracking-wide transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-[3px_3px_0px_0px_hsl(var(--foreground))] hover:shadow-[5px_5px_0px_0px_hsl(var(--foreground))] hover:-translate-x-px hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0px_0px_hsl(var(--foreground))]",
                    bg,
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] font-medium text-muted-foreground mt-2">
              {addAssetMint === "sol"
                ? `Wallet balance: ${walletSolBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${SOL_LABEL}`
                : selectedToken
                  ? `Wallet balance: ${selectedToken.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${selectedToken.label}`
                  : ""}
            </p>
          </div>
          <Button
            variant="default"
            size="default"
            onClick={handleAddAsset}
            disabled={addingAsset || addAssetAmount <= 0}
            className="w-full"
          >
            {addingAsset ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Depositing...</>
            ) : (
              <><Plus className="h-4 w-4" /> Deposit</>
            )}
          </Button>
          <p className="text-xs font-medium text-muted-foreground">
            Registers a new token type in the vault. To add more to an existing asset, use Top Up.
          </p>
        </div>
      )}
    </div>
  );
};

export default AddAssetSection;
