import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { useWalletSplTokens } from "@/hooks/useWalletSplTokens";
import { cn, errMsg, toRawTokenAmount } from "@/lib/utils";
import { amountStep, pctOfMax } from "@/lib/utils/math";
import { Loader2, Plus } from "lucide-react";
import Sheet from "@/components/app/Sheet";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useTranslation } from "@heirloom/i18n";

const TOPUP_PCTS = [25, 50, 75, 100] as const;

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const AddAssetSection: React.FC<Props> = ({ estate, onTx }) => {
  const { registerAssetOnChain, fetchEstates } = useVault();
  const { publicKey, isConnected } = useWallet();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { t } = useTranslation("app");

  const [open, setOpen] = useState(false);
  const [addAssetMint, setAddAssetMint] = useState<string>("");
  const [addAssetAmount, setAddAssetAmount] = useState<number>(0);
  const [addingAsset, setAddingAsset] = useState(false);

  const { data: allWalletSplTokens, isLoading: walletTokensLoading } = useWalletSplTokens(
    isConnected && open ? publicKey : null,
  );

  const vaultMintSet = useMemo(
    () => new Set(estate.vaultTokens.map((vt) => vt.mint)),
    [estate.vaultTokens],
  );

  const walletSplTokens = useMemo(
    () => (allWalletSplTokens ?? []).filter((t) => !vaultMintSet.has(t.mint)),
    [allWalletSplTokens, vaultMintSet],
  );
  const selectedToken = useMemo(
    () => (walletSplTokens ?? []).find((t) => t.mint === addAssetMint),
    [walletSplTokens, addAssetMint],
  );

  // Default to first available token when dropdown opens
  useEffect(() => {
    if (open && walletSplTokens.length > 0 && !addAssetMint) {
      setAddAssetMint(walletSplTokens[0].mint);
    }
  }, [open, walletSplTokens, addAssetMint]);

  const activeDecimals = selectedToken?.decimals ?? 9;
  const activeStep = amountStep(activeDecimals);
  const maxBalance = selectedToken?.uiAmount ?? 0;

  const applyPct = (pct: number) => {
    setAddAssetAmount(pctOfMax(maxBalance, pct, activeStep));
  };

  const handleAddAsset = async () => {
    if (addAssetAmount <= 0) return;
    setAddingAsset(true);
    try {
      if (!selectedToken) throw new Error("Token not found in wallet");
      const amount = toRawTokenAmount(addAssetAmount, selectedToken.decimals);
      if (amount <= 0n) throw new Error("Amount must be greater than zero");
      const tx = await registerAssetOnChain(estate.heir, {
        mint: addAssetMint,
        amount,
        decimals: selectedToken.decimals,
        tokenProgram: selectedToken.tokenProgram,
      });
      onTx(tx);
      setOpen(false);
      setAddAssetAmount(0);
      setAddAssetMint("");
      track("asset_added", { asset_type: "token" });
      toast({ title: t("dashboard.manage.assetAddedTitle"), description: t("dashboard.manage.assetAddedDesc") });
      await fetchEstates();
    } catch (err: unknown) {
      track("asset_add_failed", { asset_type: "token" });
      toast({
        title: t("dashboard.manage.addAssetFailedTitle"),
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setAddingAsset(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        {t("dashboard.manage.addAsset")}
      </Button>

      <Sheet
        open={open}
        title={t("dashboard.manage.addAsset")}
        caption={t("dashboard.assets")}
        description={t("dashboard.manage.addAssetDesc")}
        busy={addingAsset}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              {t("dashboard.manage.cancel")}
            </Button>
            <Button
              onClick={handleAddAsset}
              disabled={addingAsset || addAssetAmount <= 0 || walletSplTokens.length === 0}
              className="w-full sm:w-auto"
            >
              {addingAsset ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {t("dashboard.manage.depositing")}</>
              ) : (
                <><Plus className="h-4 w-4" /> {t("dashboard.manage.deposit")}</>
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="cap mb-2 block">{t("dashboard.manage.asset")}</label>
            <select
              value={addAssetMint}
              onChange={(e) => {
                setAddAssetMint(e.target.value);
                setAddAssetAmount(0);
              }}
              disabled={walletSplTokens.length === 0}
              className="field cursor-pointer appearance-none pr-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                backgroundSize: "18px",
              }}
            >
              {walletSplTokens.length === 0 ? (
                <option value="">{t("dashboard.manage.noNewTokens")}</option>
              ) : (
                (walletSplTokens ?? []).map((tok) => (
                  <option key={tok.mint} value={tok.mint}>
                    {tok.label} — bal {tok.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </option>
                ))
              )}
            </select>
            {walletTokensLoading && (
              <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                {t("dashboard.manage.scanning")}
              </p>
            )}
          </div>

          <div>
            <label className="cap mb-2 block">{t("dashboard.manage.amount")}</label>
            <input
              type="number"
              min={0}
              step={activeStep}
              value={addAssetAmount || ""}
              onChange={(e) => setAddAssetAmount(Math.max(0, Number(e.target.value)))}
              placeholder="0"
              className="field field-lg field-num"
            />
            <div className="mt-2.5 flex gap-2">
              {TOPUP_PCTS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyPct(pct)}
                  disabled={maxBalance <= 0}
                  className={cn(
                    "flex-1 rounded-lg border border-tile-line py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                    "hover:border-foreground hover:bg-tile-soft disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                >
                  {pct === 100 ? "Max" : `${pct}%`}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] font-medium text-muted-foreground">
              {selectedToken
                ? `${t("dashboard.manage.walletBalance")} ${selectedToken.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${selectedToken.label}`
                : t("dashboard.manage.noTokensAvailable")}
            </p>
          </div>

          <p className="text-xs font-medium text-muted-foreground">
            {t("dashboard.manage.addAssetNote")}
          </p>
        </div>
      </Sheet>
    </>
  );
};

export default AddAssetSection;
