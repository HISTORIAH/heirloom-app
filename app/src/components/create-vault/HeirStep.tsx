import { LABEL_MAX_LEN } from "@/lib/constants";
import { cn, isValidSolanaAddress } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";
import { Check, Info } from "lucide-react";

interface Props {
  heirAddress: string;
  setHeirAddress: (s: string) => void;
  label: string;
  setLabel: (s: string) => void;
  ownerAddress: string | null;
}

const NAME_SUGGESTIONS = ["Kids", "Partner", "Family", "Charity"] as const;

const HeirStep: React.FC<Props> = ({
  heirAddress,
  setHeirAddress,
  label,
  setLabel,
  ownerAddress,
}) => {
  const { t } = useTranslation("app");
  const trimmed = heirAddress.trim();
  const isValid = isValidSolanaAddress(trimmed);
  const isOwner = isValid && ownerAddress != null && trimmed === ownerAddress;
  const showValid = isValid && !isOwner;
  const showInvalid = trimmed.length > 0 && !isValid;

  return (
    <div>
      <div className="mb-6">
        <h2 className="ed-h3">{t("createVault.wizard.whoInheritsTitle")}</h2>
        <p className="ed-lede mt-2 text-muted-foreground">
          {t("createVault.wizard.whoInheritsLede")}
        </p>
      </div>

      <div className="space-y-6">
        {/* Heir address */}
        <div>
          <label className="ed-field-label" htmlFor="heir-address">
            {t("createVault.wizard.heirWalletLabel")}
          </label>
          <input
            id="heir-address"
            type="text"
            value={heirAddress}
            onChange={(e) => setHeirAddress(e.target.value)}
            maxLength={128}
            spellCheck={false}
            autoComplete="off"
            className={cn("ed-input mt-2 font-mono", showInvalid && "border-accent-red")}
            placeholder={t("createVault.wizard.heirWalletHint")}
          />
          {showValid && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-tile-soft px-4 py-3.5">
              <Check
                className="h-[1.125rem] w-[1.125rem] shrink-0 text-accent-lime"
                strokeWidth={3}
              />
              <span className="text-sm">{t("createVault.wizard.heirValid")}</span>
              <span className="font-mono text-lg font-bold tracking-wider">
                {trimmed.slice(0, 4)} ··· {trimmed.slice(-4)}
              </span>
            </div>
          )}
          {showInvalid && (
            <p role="alert" className="mt-2 text-sm text-accent-red">
              {t("createVault.wizard.heirInvalid")}
            </p>
          )}
          {isOwner && (
            <p role="alert" className="mt-2 text-sm text-accent-red">
              {t("createVault.wizard.heirIsOwner")}
            </p>
          )}
        </div>

        {/* Estate name */}
        <div>
          <label className="ed-field-label" htmlFor="estate-label">
            {t("createVault.wizard.labelWhatToCall")}
          </label>
          <input
            id="estate-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, LABEL_MAX_LEN))}
            maxLength={LABEL_MAX_LEN}
            autoComplete="off"
            className="ed-input mt-2"
            placeholder={t("createVault.wizard.labelPlaceholder")}
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            {NAME_SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setLabel(sug)}
                className={cn(
                  "min-h-[2.25rem] rounded-full border px-3.5 text-sm transition-colors",
                  label === sug
                    ? "border-foreground bg-foreground text-background"
                    : "border-tile-line bg-background hover:bg-tile-soft",
                )}
              >
                {sug}
              </button>
            ))}
          </div>
          <div className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span>{t("createVault.wizard.labelHint")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeirStep;
