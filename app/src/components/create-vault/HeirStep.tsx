import { LABEL_MAX_LEN } from "@/lib/constants";
import { StepHeader } from "@/components/create-vault/StepHeader";
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
      <StepHeader cap={t("createVault.wizard.step01")} title={t("createVault.wizard.whoInheritsTitle")} />

      <div className="space-y-5 border-t border-tile-line pt-6">
        <Field
          id="estate-label"
          label={t("createVault.wizard.labelWhatToCall")}
          hint={t("createVault.wizard.labelOnlyYou")}
        >
          <input
            id="estate-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, LABEL_MAX_LEN))}
            maxLength={LABEL_MAX_LEN}
            className="ed-input mt-2"
            placeholder={t("createVault.wizard.labelPlaceholderMum")}
          />
        </Field>

        <Field
          id="heir-address"
          label={t("createVault.wizard.heirWalletLabel")}
          hint={t("createVault.wizard.heirWalletHint")}
        >
          <input
            id="heir-address"
            type="text"
            value={heirAddress}
            onChange={(e) => setHeirAddress(e.target.value)}
            maxLength={128}
            spellCheck={false}
            autoComplete="off"
            className="ed-input mt-2 font-mono"
            placeholder={t("createVault.wizard.pasteAddress")}
          />
        </Field>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
        <span className="ed-label">{t("createVault.wizard.optionalLabel")}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-tile-line" />
      </div>

      <div className="mt-6 space-y-5">
        <Field
          id="guardian-address"
          label={t("createVault.wizard.guardianPlain")}
          hint={t("createVault.wizard.guardianHint")}
        >
          <input
            id="guardian-address"
            type="text"
            value={delegate}
            onChange={(e) => setDelegate(e.target.value)}
            maxLength={128}
            spellCheck={false}
            autoComplete="off"
            className="ed-input mt-2 font-mono"
            placeholder={t("createVault.wizard.leaveBlank")}
          />
        </Field>

        <Field
          id="signer-address"
          label={t("createVault.wizard.signerLabelPlain")}
          hint={t("createVault.wizard.signerHint")}
        >
          <input
            id="signer-address"
            type="text"
            value={hbSigner}
            onChange={(e) => setHbSigner(e.target.value)}
            maxLength={128}
            spellCheck={false}
            autoComplete="off"
            className="ed-input mt-2 font-mono"
            placeholder={t("createVault.wizard.leaveBlank")}
          />
        </Field>
      </div>
    </div>
  );
};

const Field: React.FC<{
  id: string;
  label: string;
  hint: string;
  children: React.ReactNode;
}> = ({ id, label, hint, children }) => (
  <div>
    <label className="ed-field-label" htmlFor={id}>
      {label}
    </label>
    {children}
    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
  </div>
);

export default HeirStep;
