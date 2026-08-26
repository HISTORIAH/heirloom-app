import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/surface/Modal";
import { PercentRow } from "@/components/surface/PercentRow";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { useWalletSplTokens } from "@/hooks/useWalletSplTokens";
import { errMsg, toRawTokenAmount } from "@/lib/utils";
import { amountStep, pctOfMax } from "@/lib/utils/math";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  estate: EstateData;
  onTx: (id: string) => void;
}

const AddAssetSection: React.FC<Props> = ({ estate, onTx }) => {
  const { t } = useTranslation("app");
  const { registerAssetOnChain, fetchEstates } = useVault();
  const { publicKey, isConnected } = useWallet();
  const { toast } = useToast();
  const { track } = useAnalytics();

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
    () => (allWalletSplTokens ?? []).filter((tok) => !vaultMintSet.has(tok.mint)),
    [allWalletSplTokens, vaultMintSet],
  );
  const selectedToken = useMemo(
    () => walletSplTokens.find((tok) => tok.mint === addAssetMint),
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
      toast({ title: t("dashboard.manage.assetAddedTitle"), description: t("dashboard.manage.assetAddedEstateDesc") });
      await fetchEstates();
    } catch (err: unknown) {
      track("asset_add_failed", { asset_type: "token" });
      toast({ title: t("dashboard.manage.couldNotAddAsset"), description: errMsg(err), variant: "destructive" });
    } finally {
      setAddingAsset(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-tile-line px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-tile-soft"
      >
        {t("dashboard.manage.addAssetShort")}
      </button>

      <Modal
        open={open}
        cap={t("dashboard.manage.assetsCap")}
        title={t("dashboard.manage.addAssetShort")}
        description={t("dashboard.manage.addAssetEditorialDesc")}
        busy={addingAsset}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button
              variant="flat-outline"
              size="default"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="flat"
              size="default"
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
            <label className="ed-field-label" htmlFor="add-asset-mint">
              {t("dashboard.manage.tokenLabel")}
            </label>
            <div className="relative mt-2">
              <select
                id="add-asset-mint"
                value={addAssetMint}
                onChange={(e) => {
                  setAddAssetMint(e.target.value);
                  setAddAssetAmount(0);
                }}
                disabled={walletSplTokens.length === 0}
                className="ed-input cursor-pointer appearance-none pr-10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {walletSplTokens.length === 0 ? (
                  <option value="">{t("dashboard.manage.noNewTokensWallet")}</option>
                ) : (
                  walletSplTokens.map((tok) => (
                    <option key={tok.mint} value={tok.mint}>
                      {tok.label} — {tok.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={2}
              />
            </div>
            {walletTokensLoading && (
              <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                {t("dashboard.manage.scanningWallet")}
              </p>
            )}
          </div>

          <div>
            <label className="ed-field-label" htmlFor="add-asset-amount">
              {t("dashboard.manage.amount")}
            </label>
            <input
              id="add-asset-amount"
              type="number"
              min={0}
              step={activeStep}
              value={addAssetAmount || ""}
              onChange={(e) => setAddAssetAmount(Math.max(0, Number(e.target.value)))}
              placeholder="0"
              className="ed-input mt-2 text-center font-display text-2xl font-semibold tabular-nums"
            />
            <PercentRow
              className="mt-3"
              disabled={maxBalance <= 0}
              onPick={(pct) => setAddAssetAmount(pctOfMax(maxBalance, pct, activeStep))}
            />
            <p className="mt-2 text-[11px] font-medium text-muted-foreground">
              {selectedToken
                ? t("yield.walletBalanceAmt", {
                    amount: selectedToken.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 }),
                    symbol: selectedToken.label,
                  })
                : t("dashboard.manage.noTokensToAdd")}
            </p>
          </div>

          <p className="text-xs font-medium text-muted-foreground">
            {t("dashboard.manage.registerTokenNote")}
          </p>
        </div>
      </Modal>
    </>
  );
};

export default AddAssetSection;
