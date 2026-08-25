import { useState } from "react";
import { Button } from "@/components/ui/button";
import Sheet from "@/components/app/Sheet";
import { amountStep, pctOfMax } from "@/lib/utils/math";
import { Loader2, TrendingUp, Coins } from "lucide-react";
import { type TopUpDialogProps } from "@/types/strategy-ui";
import { useTranslation } from "@heirloom/i18n";

const TOPUP_PCTS = [25, 50, 75, 100] as const;

export const TopUpDialog: React.FC<TopUpDialogProps> = ({
  open,
  symbol,
  decimals,
  vaultBalance,
  walletBalance,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const { t, i18n } = useTranslation("app");
  const [amount, setAmount] = useState(0);
  const step = amountStep(decimals);

  const applyPct = (pct: number) => {
    setAmount(pctOfMax(walletBalance, pct, step));
  };

  const handleConfirm = () => {
    if (amount <= 0) return;
    onConfirm(amount);
  };

  return (
    <Sheet
      open={open}
      title={t("dashboard.topUpTitle", { symbol })}
      caption={t("dashboard.assets")}
      icon={<Coins strokeWidth={2} />}
      busy={loading}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading} className="w-full sm:w-auto">
            {t("dashboard.manage.cancel")}
          </Button>
          <Button
            variant="yellow"
            onClick={handleConfirm}
            disabled={loading || amount <= 0 || amount > walletBalance}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("dashboard.sending")}</>
            ) : (
              <><TrendingUp className="h-4 w-4" /> {t("dashboard.topUp")}</>
            )}
          </Button>
        </>
      }
    >
      <p className="text-sm font-medium text-muted-foreground">
        {t("dashboard.topUpDesc", { symbol })}
      </p>

      <div className="mt-4">
        <div className="data-row">
          <span className="data-k">{t("dashboard.currentVaultBalance")}</span>
          <span className="data-v tabular-nums">
            {vaultBalance.toLocaleString(undefined, { maximumFractionDigits: decimals })} {symbol}
          </span>
        </div>
        <div className="data-row">
          <span className="data-k">{t("dashboard.walletBalanceLabel")}</span>
          <span className="data-v tabular-nums">
            {walletBalance.toLocaleString(i18n.language, { maximumFractionDigits: decimals })} {symbol}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <label className="cap mb-2 block">{t("dashboard.manage.amount")}</label>
        <input
          type="number"
          min={0}
          step={step}
          value={amount || ""}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
          placeholder="0"
          aria-label={t("dashboard.manage.amount")}
          className="field field-lg field-num"
        />
        <div className="mt-2.5 flex gap-2">
          {TOPUP_PCTS.map((pct) => (
            <button
              key={pct}
              onClick={() => applyPct(pct)}
              className="flex-1 rounded-lg border border-tile-line py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:border-foreground hover:bg-tile-soft"
            >
              {pct === 100 ? t("createVault.wizard.max") : `${pct}%`}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
};
