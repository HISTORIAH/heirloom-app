import { Button } from "@/components/ui/button";
import { Modal } from "@/components/surface/Modal";
import { cn } from "@/lib/utils";
import { Landmark, Loader2, Sprout, Zap } from "lucide-react";
import { type PreflightRecallDialogProps } from "@/types/strategy-ui";
import { useTranslation } from "@heirloom/i18n";

export const PreflightRecallDialog: React.FC<PreflightRecallDialogProps> = ({
  open,
  strategies,
  actionName,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const { t } = useTranslation("app");
  const activeStrategies = strategies.filter((s) => s.active);
  const verb = actionName.toLowerCase();

  return (
    <Modal
      open={open}
      cap={t("yield.capHeadsUp")}
      title={t("yield.fundsOutEarning")}
      description={t("yield.beforeAction", { action: verb })}
      size="lg"
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
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("yield.preparing")}</>
            ) : (
              <><Zap className="h-4 w-4" /> {t("yield.recallAndAction", { action: verb })}</>
            )}
          </Button>
        </>
      }
    >
      <div className="divide-y divide-tile-line border-y border-tile-line">
        {activeStrategies.map((s, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <span
              className={cn(
                "shrink-0 rounded-lg p-2",
                s.type === "lulo" ? "bg-accent-purple/20" : "bg-accent-lime/20",
              )}
            >
              {s.type === "lulo" ? (
                <Landmark className="h-4 w-4" strokeWidth={2} />
              ) : (
                <Sprout className="h-4 w-4" strokeWidth={2} />
              )}
            </span>
            <p className="min-w-0 flex-1 text-sm font-semibold tabular-nums">
              {s.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
              {s.type === "lulo" ? t("yield.tokensInLulo") : t("yield.solStaked")}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs font-medium text-muted-foreground">
        {t("yield.oneSigCovers", { action: verb })}
      </p>
    </Modal>
  );
};
