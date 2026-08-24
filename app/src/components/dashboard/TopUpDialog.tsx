import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalStat } from "@/components/surface/Modal";
import { PercentRow } from "@/components/surface/PercentRow";
import { amountStep, pctOfMax } from "@/lib/utils/math";
import { Loader2, Plus } from "lucide-react";
import { type TopUpDialogProps } from "@/types/strategy-ui";
import { useTranslation } from "@heirloom/i18n";

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
  const { t } = useTranslation("app");
  const [amount, setAmount] = useState(0);
  const step = amountStep(decimals);

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: decimals });

  return (
    <Modal
      open={open}
      cap={t("common.deposit")}
      accent="bg-accent-yellow"
      title={t("yield.topUpSymbol", { symbol })}
      description={t("yield.moveIntoVault", { symbol })}
      busy={loading}
      onClose={onCancel}
      footer={
        <>
          <Button
            variant="flat-outline"
            size="default"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="flat-yellow"
            size="default"
            onClick={() => amount > 0 && onConfirm(amount)}
            disabled={loading || amount <= 0 || amount > walletBalance}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("yield.sendingEllipsis")}</>
            ) : (
              <><Plus className="h-4 w-4" /> {t("yield.topUp")}</>
            )}
          </Button>
        </>
      }
    >
      <ModalStat label={t("yield.inVault")} value={`${fmt(vaultBalance)} ${symbol}`} />

      <input
        type="number"
        min={0}
        step={step}
        value={amount || ""}
        onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
        placeholder="0"
        aria-label={t("yield.amountAria", { symbol })}
        className="ed-input mt-4 text-center font-display text-2xl font-semibold tabular-nums"
      />

      <PercentRow
        className="mt-3"
        disabled={walletBalance <= 0}
        onPick={(pct) => setAmount(pctOfMax(walletBalance, pct, step))}
      />

      <p className="mt-3 text-[11px] font-medium text-muted-foreground">
        {t("yield.walletBalanceAmt", { amount: fmt(walletBalance), symbol })}
      </p>
    </Modal>
  );
};
