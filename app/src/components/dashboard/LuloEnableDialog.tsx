import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/surface/Modal";
import { OptionCard } from "@/components/surface/OptionCard";
import { getYieldConfigByMint } from "@/lib/yieldTokens";
import { Loader2, ShieldCheck, ShieldOff, Zap } from "lucide-react";
import { type LuloEnableDialogProps } from "@/types/strategy-ui";
import { useTranslation } from "@heirloom/i18n";

export const LuloEnableDialog: React.FC<LuloEnableDialogProps> = ({
  open,
  tokenSymbol,
  tokenMint,
  vaultBalance,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const { t } = useTranslation("app");
  const [mode, setMode] = useState<"protected" | "unprotected">("protected");
  const config = getYieldConfigByMint(tokenMint);

  if (!config) return null;

  const amount = vaultBalance.toLocaleString(undefined, { maximumFractionDigits: 6 });

  return (
    <Modal
      open={open}
      cap={t("yield.capYield")}
      title={t("yield.earnYieldTitle")}
      description={t("yield.routeFromVault", { amount, symbol: tokenSymbol })}
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
            variant="flat"
            size="default"
            onClick={() => onConfirm({ protected: mode === "protected" })}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("yield.confirming")}</>
            ) : (
              <><Zap className="h-4 w-4" /> {t("yield.routeButton")}</>
            )}
          </Button>
        </>
      }
    >
      <p className="ed-label">{t("yield.chooseDepositType")}</p>

      <div className="mt-3 space-y-2">
        <OptionCard
          selected={mode === "protected"}
          onSelect={() => setMode("protected")}
          disabled={loading}
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={2} />}
          accent="bg-accent-cyan"
          title={t("yield.protected")}
          badge={t("yield.recommended")}
          note={t("yield.apy", { apy: config.apyProtected.toFixed(1) })}
        >
          {t("yield.protectedInstant")}
        </OptionCard>

        <OptionCard
          selected={mode === "unprotected"}
          onSelect={() => setMode("unprotected")}
          disabled={loading}
          icon={<ShieldOff className="h-5 w-5" strokeWidth={2} />}
          accent="bg-accent-orange"
          title={t("yield.boosted")}
          note={t("yield.apy", { apy: config.apyUnprotected.toFixed(1) })}
        >
          {t("yield.boostedDesc")}
        </OptionCard>
      </div>

      <p className="mt-4 text-[11px] font-medium text-muted-foreground">
        {t("yield.yieldFeeNote")}
      </p>
    </Modal>
  );
};
