import { useState } from "react";
import { Button } from "@/components/ui/button";
import Sheet from "@/components/app/Sheet";
import Choice from "@/components/app/Choice";
import { getYieldConfigByMint } from "@/lib/yieldTokens";
import { Landmark, ShieldCheck, ShieldOff, Loader2, Zap } from "lucide-react";
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
  const { t, i18n } = useTranslation("app");
  const [selectedMode, setSelectedMode] = useState<"protected" | "unprotected">("protected");
  const config = getYieldConfigByMint(tokenMint);

  if (!config) return null;

  return (
    <Sheet
      open={open}
      title={t("yield.enableLulo")}
      caption={t("yield.earn")}
      icon={<Landmark strokeWidth={2} />}
      size="lg"
      busy={loading}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading} className="w-full sm:w-auto">
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => onConfirm({ protected: selectedMode === "protected" })}
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
      <p className="text-sm font-medium text-muted-foreground">
        {t("yield.routeToLulo", {
          amount: vaultBalance.toLocaleString(i18n.language, { maximumFractionDigits: 6 }),
          symbol: tokenSymbol,
        })}
      </p>

      <p className="cap mt-6">{t("yield.chooseDeposit")}</p>
      <div className="mt-3 space-y-2.5">
        <Choice
          selected={selectedMode === "protected"}
          onClick={() => setSelectedMode("protected")}
          disabled={loading}
          icon={<ShieldCheck strokeWidth={2} />}
          title={t("yield.protected")}
          badge={<span className="tag tag-accent">{t("yield.recommended")}</span>}
          description={t("yield.protectedDesc")}
          meta={t("yield.apy", { apy: config.apyProtected.toFixed(1) })}
        />
        <Choice
          selected={selectedMode === "unprotected"}
          onClick={() => setSelectedMode("unprotected")}
          disabled={loading}
          icon={<ShieldOff strokeWidth={2} />}
          title={t("yield.unprotected")}
          description={t("yield.unprotectedDesc")}
          meta={t("yield.apy", { apy: config.apyUnprotected.toFixed(1) })}
        />
      </div>
    </Sheet>
  );
};
