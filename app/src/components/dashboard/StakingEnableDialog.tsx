import { useState } from "react";
import { Button } from "@/components/ui/button";
import Sheet from "@/components/app/Sheet";
import Choice from "@/components/app/Choice";
import { Sprout, Loader2, Zap, Shield, Flame, Timer } from "lucide-react";

import { type ValidatorOption, type StakingEnableDialogProps } from "@/types/strategy-ui";
import { useTranslation } from "@heirloom/i18n";

// TEMP: placeholder validator list — replace with live API before launch
const VALIDATOR_OPTIONS: ValidatorOption[] = [
  {
    id: "jito",
    name: "Jito",
    apy: 6.2,
    commission: 5,
    icon: <Flame strokeWidth={2} />,
    accent: "bg-tile-soft",
    descriptionKey: "yield.validatorJitoDesc",
  },
  {
    id: "marinade",
    name: "Marinade",
    apy: 5.8,
    commission: 6,
    icon: <Shield strokeWidth={2} />,
    accent: "bg-tile-soft",
    descriptionKey: "yield.validatorMarinadeDesc",
  },
];

export const StakingEnableDialog: React.FC<StakingEnableDialogProps> = ({
  open,
  solBalance,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const { t, i18n } = useTranslation("app");
  const [selectedValidator, setSelectedValidator] = useState<string>(VALIDATOR_OPTIONS[0].id);

  const selected = VALIDATOR_OPTIONS.find((v) => v.id === selectedValidator)!;

  return (
    <Sheet
      open={open}
      title={t("yield.stakeSol")}
      caption={t("yield.earn")}
      icon={<Sprout strokeWidth={2} />}
      size="lg"
      busy={loading}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading} className="w-full sm:w-auto">
            {t("common.cancel")}
          </Button>
          <Button onClick={() => onConfirm(selectedValidator)} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("yield.confirming")}</>
            ) : (
              <><Zap className="h-4 w-4" /> {t("yield.delegateTo", { name: selected.name })}</>
            )}
          </Button>
        </>
      }
    >
      <p className="text-sm font-medium text-muted-foreground">
        {t("yield.stakeDesc", {
          amount: solBalance.toLocaleString(i18n.language, { maximumFractionDigits: 4 }),
        })}
      </p>

      <p className="cap mt-6">{t("yield.chooseValidator")}</p>
      <div className="mt-3 space-y-2.5">
        {VALIDATOR_OPTIONS.map((validator) => (
          <Choice
            key={validator.id}
            selected={selectedValidator === validator.id}
            onClick={() => setSelectedValidator(validator.id)}
            disabled={loading}
            icon={validator.icon}
            title={validator.name}
            badge={
              <span className="tag">{t("yield.apy", { apy: validator.apy.toFixed(1) })}</span>
            }
            description={t(validator.descriptionKey)}
            meta={t("yield.commission", { pct: String(validator.commission) })}
          />
        ))}
      </div>

      <div className="mt-5">
        <div className="data-row">
          <span className="data-k">{t("yield.selected")}</span>
          <span className="data-v">
            {t("yield.selectedApy", { name: selected.name, apy: selected.apy.toFixed(1) })}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 border-t border-tile-line pt-4">
        <Timer className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
        <div>
          <p className="text-sm font-semibold">{t("yield.epochTitle")}</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{t("yield.epochDesc")}</p>
        </div>
      </div>
    </Sheet>
  );
};
