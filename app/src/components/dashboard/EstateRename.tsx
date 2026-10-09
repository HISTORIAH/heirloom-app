import { useState } from "react";
import type { UiWalletAccount } from "@wallet-standard/ui";
import { Pencil } from "lucide-react";
import { useVault, type EstateData } from "@/contexts/VaultContext";
import { useToast } from "@/hooks/use-toast";
import { useWithSession } from "@/hooks/useWithSession";
import { updateEstate } from "@/services/api/estateMetadata";
import { LABEL_MAX_LEN } from "@/lib/constants";
import { errMsg, truncateAddress } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";

/**
 * The open estate's name in the estates bar, renamed in place. The name is stored by the
 * backend, not on-chain, so saving costs a sign-in at most and never a transaction.
 */
export const EstateRename: React.FC<{ estate: EstateData; account: UiWalletAccount }> = ({
  estate,
  account,
}) => {
  const { t } = useTranslation("app");
  const { fetchEstates } = useVault();
  const { toast } = useToast();
  const { withSession } = useWithSession(account);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const name = estate.label ?? truncateAddress(estate.heir, 4);

  const save = async () => {
    const next = draft.trim();
    if (!next || next === estate.label) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await withSession(() => updateEstate(estate.estatePda, { name: next }));
      await fetchEstates();
      setEditing(false);
    } catch (err) {
      toast({
        title: t("dashboard.renameFailed"),
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <input
          autoFocus
          value={draft}
          maxLength={LABEL_MAX_LEN}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          aria-label={t("dashboard.estateNameLabel")}
          className="w-48 min-w-0 rounded-lg border border-foreground px-2.5 py-1.5 text-sm outline-none"
        />
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg border border-foreground bg-foreground px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-background disabled:opacity-60"
        >
          {t("common.save")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="truncate text-sm font-semibold">{name}</span>
      <button
        onClick={() => {
          setDraft(estate.label ?? "");
          setEditing(true);
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-tile-soft"
      >
        <Pencil className="h-3.5 w-3.5" /> {t("dashboard.rename")}
      </button>
    </div>
  );
};
