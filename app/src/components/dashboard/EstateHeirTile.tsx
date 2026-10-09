import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Panel, PanelCap } from "@/components/surface/Panel";
import { DASHBOARD_CARD } from "@/components/dashboard/estateState";
import { LABEL_MAX_LEN } from "@/lib/constants";
import { cn, truncateAddress } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";
import type { EstateData } from "@/contexts/VaultContext";

const Field: React.FC<{ label: string; value: string | null; empty: string }> = ({
  label,
  value,
  empty,
}) => (
  <div className="py-4">
    <span className="text-sm text-muted-foreground">{label}</span>
    {value ? (
      <p className="mt-1 font-mono text-base tabular-nums" title={value}>
        {truncateAddress(value, 4)}
      </p>
    ) : (
      <p className="mt-1 text-sm text-muted-foreground">{empty}</p>
    )}
  </div>
);

interface EstateHeirTileProps {
  estate: EstateData;
  /** From the reminders heir profile — the same name the heir alert uses. */
  heirName: string | null;
  /**
   * Saves the heir name inline. Undefined when it can't be saved from here (no session, or no
   * reminders yet); the link then goes through `onSetUpName` instead.
   */
  onSaveName?: (name: string) => Promise<void>;
  /** Opens the reminders flow (sign in, or set up) where the heir's name lives. */
  onSetUpName?: () => void;
  className?: string;
}

export const EstateHeirTile: React.FC<EstateHeirTileProps> = ({
  estate,
  heirName,
  onSaveName,
  onSetUpName,
  className,
}) => {
  const { t } = useTranslation("app");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCopyHeir = () => {
    navigator.clipboard.writeText(estate.heir);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEdit = () => {
    if (!onSaveName) {
      onSetUpName?.();
      return;
    }
    setDraft(heirName ?? "");
    setEditing(true);
  };

  const save = async () => {
    if (!onSaveName || saving) return;
    setSaving(true);
    try {
      await onSaveName(draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const canEdit = !!onSaveName || !!onSetUpName;

  return (
    <Panel bare className={cn("h-full", DASHBOARD_CARD, className)}>
      <PanelCap className="text-muted-foreground">{t("dashboard.heirDetails")}</PanelCap>

      <div className="mt-[18px] flex items-start justify-between gap-3 rounded-xl border border-tile-line px-[18px] py-4">
        <div className="min-w-0 flex-1">
          <span className="text-sm text-muted-foreground">{t("dashboard.heir")}</span>
          {heirName ? (
            <>
              <p className="mt-1.5 truncate text-lg font-semibold">{heirName}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground" title={estate.heir}>
                {truncateAddress(estate.heir, 4)}
              </p>
            </>
          ) : (
            <p className="mt-1.5 font-mono text-base tabular-nums" title={estate.heir}>
              {truncateAddress(estate.heir, 4)}
            </p>
          )}

          {editing ? (
            <div className="mt-2.5 flex items-center gap-2">
              <input
                autoFocus
                value={draft}
                maxLength={LABEL_MAX_LEN}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") setEditing(false);
                }}
                placeholder={t("dashboard.heirNamePlaceholder")}
                aria-label={t("dashboard.heirNameLabel")}
                className="min-w-0 flex-1 rounded-lg border border-foreground px-2.5 py-2 text-sm outline-none"
              />
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg border border-foreground bg-foreground px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-background disabled:opacity-60"
              >
                {t("common.save")}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg border border-tile-line px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em]"
              >
                {t("common.cancel")}
              </button>
            </div>
          ) : (
            canEdit && (
              <button
                onClick={startEdit}
                className="mt-2.5 text-xs font-semibold underline underline-offset-[3px] transition-colors hover:text-muted-foreground"
              >
                {heirName ? t("dashboard.renameHeir") : t("dashboard.addLabel")}
              </button>
            )
          )}
        </div>
        <button
          onClick={handleCopyHeir}
          title={t("dashboard.copyHeirAddress")}
          aria-label={t("dashboard.copyHeirAddress")}
          className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg border border-tile-line transition-colors hover:bg-tile-soft"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </div>

      <div className="mt-1 divide-y divide-tile-line">
        <Field
          label={`${t("dashboard.guardian")}${estate.delegate && estate.isDeferred ? ` (${t("dashboard.pauseUsed")})` : ""}`}
          value={estate.delegate}
          empty={t("common.notSet")}
        />
        <Field
          label={t("dashboard.heartbeatSigner")}
          value={estate.checkInSigner}
          empty={t("common.notSet")}
        />
      </div>
    </Panel>
  );
};
