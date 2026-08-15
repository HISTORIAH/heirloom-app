import { Users } from "lucide-react";
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
      {/* Step header */}
      <div className="flex items-center gap-4 mb-5">
        <div
          className="bg-accent-pink border-4 border-foreground rounded-xl p-3.5 shadow-[4px_4px_0_0_hsl(var(--foreground))]"
        >
          <Users className="h-5 w-5" strokeWidth={2} />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[3px] text-accent-pink">{t("createVault.wizard.step1")}</div>
          <h3 className="text-2xl font-display">{t("createVault.wizard.whoInherits")}</h3>
        </div>
      </div>

      <div className="space-y-7">
        <div>
          <label className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground block mb-2.5">
            {t("createVault.wizard.labelLabel")}
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, LABEL_MAX_LEN))}
            maxLength={LABEL_MAX_LEN}
            className="w-full border-4 border-foreground rounded-xl px-5 py-4 bg-background font-bold text-base transition-all duration-150 shadow-[4px_4px_0_0_hsl(var(--foreground))] focus:shadow-[6px_6px_0_0_hsl(var(--foreground))] focus:-translate-x-0.5 focus:-translate-y-0.5 focus:outline-none"
            placeholder={t("createVault.wizard.labelPlaceholder")}
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground block mb-2.5">
            {t("createVault.wizard.heirAddressLabel")}
          </label>
          <input
            type="text"
            value={heirAddress}
            onChange={(e) => setHeirAddress(e.target.value)}
            maxLength={128}
            className="w-full border-4 border-foreground rounded-xl px-5 py-4 bg-background font-mono text-sm transition-all duration-150 shadow-[4px_4px_0_0_hsl(var(--foreground))] focus:shadow-[6px_6px_0_0_hsl(var(--foreground))] focus:-translate-x-0.5 focus:-translate-y-0.5 focus:outline-none"
            placeholder={t("createVault.wizard.heirAddressPlaceholder")}
          />
        </div>

        {/* Optional divider */}
        <div className="flex items-center gap-3.5 my-7">
          <div className="flex-1 h-0.5 bg-gray-200" />
          <span className="text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground">{t("createVault.wizard.optional")}</span>
          <div className="flex-1 h-0.5 bg-gray-200" />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground block mb-2.5">
            {t("createVault.wizard.guardianLabel")}
          </label>
          <input
            type="text"
            value={delegate}
            onChange={(e) => setDelegate(e.target.value)}
            maxLength={128}
            className="w-full border-4 border-foreground rounded-xl px-5 py-4 bg-background font-mono text-sm transition-all duration-150 shadow-[4px_4px_0_0_hsl(var(--foreground))] focus:shadow-[6px_6px_0_0_hsl(var(--foreground))] focus:-translate-x-0.5 focus:-translate-y-0.5 focus:outline-none"
            placeholder={t("createVault.wizard.addressOptional")}
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground block mb-2.5">
            {t("createVault.wizard.signerLabel")}
          </label>
          <input
            type="text"
            value={hbSigner}
            onChange={(e) => setHbSigner(e.target.value)}
            maxLength={128}
            className="w-full border-4 border-foreground rounded-xl px-5 py-4 bg-background font-mono text-sm transition-all duration-150 shadow-[4px_4px_0_0_hsl(var(--foreground))] focus:shadow-[6px_6px_0_0_hsl(var(--foreground))] focus:-translate-x-0.5 focus:-translate-y-0.5 focus:outline-none"
            placeholder={t("createVault.wizard.addressOptional")}
          />
        </div>
      </div>
    </div>
  );
};

export default HeirStep;