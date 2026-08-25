import { Button } from "@/components/ui/button";
import Sheet from "@/components/app/Sheet";
import { Loader2, ArrowLeftRight } from "lucide-react";
import { type RecallConfirmDialogProps } from "@/types/strategy-ui";
import { useTranslation } from "@heirloom/i18n";

export const RecallConfirmDialog: React.FC<RecallConfirmDialogProps> = ({
  open,
  strategyType,
  tokenSymbol,
  routedAmount,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const { t, i18n } = useTranslation("app");

  const title = strategyType === "lulo" ? t("yield.recallLulo") : t("yield.unstakeSol");
  const unit = strategyType === "lulo" ? tokenSymbol || t("yield.tokens") : "SOL";

  return (
    <Sheet
      open={open}
      title={title}
      caption={t("yield.recall")}
      busy={loading}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading} className="w-full sm:w-auto">
            {t("common.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("yield.recalling")}</>
            ) : (
              <><ArrowLeftRight className="h-4 w-4" /> {title}</>
            )}
          </Button>
        </>
      }
    >
      {/* The amount is the whole question, so it is set as the figure. */}
      <p className="cap">{t("yield.recall")}</p>
      <p className="num-xl mt-2">
        {routedAmount.toLocaleString(i18n.language, { maximumFractionDigits: 6 })}{" "}
        <span className="text-lg text-muted-foreground">{unit}</span>
      </p>
      <p className="mt-3 max-w-[46ch] text-sm font-medium text-muted-foreground">
        {t("yield.pullBack", {
          amount: routedAmount.toLocaleString(i18n.language, { maximumFractionDigits: 6 }),
          unit,
        })}
      </p>

      <div className="mt-5 border-t border-tile-line pt-4">
        <p className="text-sm font-semibold">{t("yield.oneSigTitle")}</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          {strategyType === "lulo" ? t("yield.oneSigLulo") : t("yield.oneSigStake")}
        </p>
      </div>
    </Sheet>
  );
};
