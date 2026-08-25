import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalStat } from "@/components/surface/Modal";
import { OptionCard } from "@/components/surface/OptionCard";
import { Flame, Loader2, Shield, Timer, Zap } from "lucide-react";
import { type ValidatorOption, type StakingEnableDialogProps } from "@/types/strategy-ui";
import { useTranslation } from "@heirloom/i18n";

// TEMP: placeholder validator list — replace with live API before launch
const VALIDATOR_OPTIONS: ValidatorOption[] = [
  {
    id: "jito",
    name: "Jito",
    apy: 6.2,
    commission: 5,
    icon: <Flame className="h-5 w-5" strokeWidth={2} />,
    accent: "bg-accent-orange",
  },
  {
    id: "marinade",
    name: "Marinade",
    apy: 5.8,
    commission: 6,
    icon: <Shield className="h-5 w-5" strokeWidth={2} />,
    accent: "bg-accent-cyan",
  },
];

export const StakingEnableDialog: React.FC<StakingEnableDialogProps> = ({
  open,
  solBalance,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const { t } = useTranslation("app");
  const [selectedValidator, setSelectedValidator] = useState<string>(VALIDATOR_OPTIONS[0].id);
  const selected = VALIDATOR_OPTIONS.find((v) => v.id === selectedValidator)!;

  const amount = solBalance.toLocaleString(undefined, { maximumFractionDigits: 4 });

  return (
    <Modal
      open={open}
      cap={t("yield.capStaking")}
      title={t("yield.stakeVaultSol")}
      description={t("yield.stakeVaultDesc", { amount })}
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
            onClick={() => onConfirm(selectedValidator)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("yield.confirming")}</>
            ) : (
              <><Zap className="h-4 w-4" /> {t("yield.delegateTo", { name: selected.name })}</>
            )}
          </Button>
        </>
      }
    >
      <p className="ed-label">{t("yield.chooseValidator")}</p>

      <div className="mt-3 space-y-2">
        {VALIDATOR_OPTIONS.map((validator) => (
          <OptionCard
            key={validator.id}
            selected={selectedValidator === validator.id}
            onSelect={() => setSelectedValidator(validator.id)}
            disabled={loading}
            icon={validator.icon}
            accent={validator.accent}
            title={validator.name}
            badge={t("yield.apy", { apy: validator.apy.toFixed(1) })}
            note={t("yield.commissionPct", { pct: validator.commission })}
          >
            {validator.id === "jito" ? t("yield.jitoEditorial") : t("yield.marinadeEditorial")}
          </OptionCard>
        ))}
      </div>

      <ModalStat
        className="mt-4"
        label={t("yield.selected")}
        value={t("yield.selectedDot", { name: selected.name, apy: selected.apy.toFixed(1) })}
      />

      <div className="mt-3 flex items-start gap-3 rounded-lg border border-tile-line px-4 py-3">
        <Timer className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
        <p className="text-xs font-medium text-muted-foreground">
          {t("yield.epochRecallNote")}
        </p>
      </div>
    </Modal>
  );
};
