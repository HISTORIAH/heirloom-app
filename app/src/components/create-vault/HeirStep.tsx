import { Users } from "lucide-react";
import StepHead from "@/components/create-vault/StepHead";
import { LABEL_MAX_LEN } from "@/lib/constants";
import { useTranslation } from "@heirloom/i18n";

interface Props {
  heirAddress: string;
  setHeirAddress: (s: string) => void;
  label: string;
  setLabel: (s: string) => void;
  delegate: string;
  setDelegate: (s: string) => void;
  hbSigner: string;
  setHbSigner: (s: string) => void;
}

const HeirStep: React.FC<Props> = ({
  heirAddress,
  setHeirAddress,
  label,
  setLabel,
  delegate,
  setDelegate,
  hbSigner,
  setHbSigner,
}) => {
  const { t } = useTranslation("app");

  return (
    <div>
      <StepHead
        step={t("createVault.wizard.step1")}
        title={t("createVault.wizard.whoInherits")}
        icon={<Users strokeWidth={2} />}
      />

      <div className="space-y-6">
        <div>
          <label className="cap mb-2 block">{t("createVault.wizard.labelLabel")}</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, LABEL_MAX_LEN))}
            maxLength={LABEL_MAX_LEN}
            className="field field-lg"
            placeholder={t("createVault.wizard.labelPlaceholder")}
          />
        </div>

        <div>
          <label className="cap mb-2 block">{t("createVault.wizard.heirAddressLabel")}</label>
          <input
            type="text"
            value={heirAddress}
            onChange={(e) => setHeirAddress(e.target.value)}
            maxLength={128}
            className="field field-lg field-mono"
            placeholder={t("createVault.wizard.heirAddressPlaceholder")}
          />
        </div>

        {/* Everything below the rule is optional, and the rule says so. */}
        <div className="flex items-center gap-3 pt-2">
          <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
          <span className="cap">{t("createVault.wizard.optional")}</span>
          <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
        </div>

        <div>
          <label className="cap mb-2 block">{t("createVault.wizard.guardianLabel")}</label>
          <input
            type="text"
            value={delegate}
            onChange={(e) => setDelegate(e.target.value)}
            maxLength={128}
            className="field field-mono"
            placeholder={t("createVault.wizard.addressOptional")}
          />
        </div>

        <div>
          <label className="cap mb-2 block">{t("createVault.wizard.signerLabel")}</label>
          <input
            type="text"
            value={hbSigner}
            onChange={(e) => setHbSigner(e.target.value)}
            maxLength={128}
            className="field field-mono"
            placeholder={t("createVault.wizard.addressOptional")}
          />
        </div>
      </div>
    </div>
  );
};

export default HeirStep;
