import { Button } from "@/components/ui/button";
import { Modal, ModalStat } from "@/components/surface/Modal";
import { ArrowLeftRight, Loader2 } from "lucide-react";
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
  const { t } = useTranslation("app");
  const isLulo = strategyType === "lulo";
  const title = isLulo ? t("yield.recallLulo") : t("yield.unstakeSol");
  const unit = isLulo ? tokenSymbol || t("yield.tokens") : "SOL";
  const amount = routedAmount.toLocaleString(undefined, { maximumFractionDigits: 6 });

  return (
    <Modal
      open={open}
      role="alertdialog"
      cap={isLulo ? t("yield.capYield") : t("yield.capStaking")}
      accent={isLulo ? "bg-accent-purple" : "bg-accent-lime"}
      title={title}
      description={t("yield.pullBackEarned", { amount, unit })}
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
            variant="flat"
            size="default"
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("yield.recalling")}</>
            ) : (
              <><ArrowLeftRight className="h-4 w-4" /> {title}</>
            )}
          </Button>
        </>
      }
    >
      <ModalStat label={t("yield.deployed")} value={`${amount} ${unit}`} />
      <p className="mt-3 text-xs font-medium text-muted-foreground">
        {isLulo ? t("yield.oneSigLuloEditorial") : t("yield.oneSigStakeEditorial")}
      </p>
    </Modal>
  );
};
