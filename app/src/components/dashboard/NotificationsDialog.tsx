import { useEffect, useState } from "react";
import { AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/surface/Modal";
import { cn } from "@/lib/utils";
import {
  type NotificationsConfig,
  type RoleNotificationConfig,
  type ReminderChannel,
  CREATOR_CHANNELS,
  HEIR_CHANNELS,
  CHANNEL_META,
} from "@/types/reminders";
import { useTranslation } from "@heirloom/i18n";

const ChannelChip: React.FC<{
  selected: boolean;
  onSelect: () => void;
  label: string;
}> = ({ selected, onSelect, label }) => (
  <button
    type="button"
    onClick={onSelect}
    className={cn(
      "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
      selected
        ? "border-foreground bg-foreground text-background"
        : "border-tile-line hover:bg-tile-soft",
    )}
  >
    {label}
  </button>
);

interface RoleSectionProps {
  title: string;
  description: string;
  channels: ReminderChannel[];
  config: RoleNotificationConfig;
  onChange: (next: RoleNotificationConfig) => void;
  backupLabel: string;
  removeLabel: string;
  addBackupLabel: string;
  channelLabel: (c: ReminderChannel) => string;
  channelPlaceholder: (c: ReminderChannel) => string;
  unverifiedText: (c: ReminderChannel) => string;
  /** Extra hint rendered under the primary input (e.g. heir Telegram bot warning). */
  primaryHint?: React.ReactNode;
  /** Extra hint rendered under the backup input. */
  backupHint?: React.ReactNode;
}

const UnverifiedNotice: React.FC<{ children: string }> = ({ children }) => (
  <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-700">
    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
    {children}
  </p>
);

const RoleSection: React.FC<RoleSectionProps> = ({
  title,
  description,
  channels,
  config,
  onChange,
  backupLabel,
  removeLabel,
  addBackupLabel,
  channelLabel,
  channelPlaceholder,
  unverifiedText,
  primaryHint,
  backupHint,
}) => {
  const primaryOptions = channels.filter((c) => c !== config.backup?.channel);
  const backupOptions = channels.filter((c) => c !== config.primary.channel);

  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{description}</p>
        </div>
        <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            className="peer sr-only"
          />
          <span className="absolute inset-0 rounded-full border border-tile-line bg-tile-soft transition-colors peer-checked:border-foreground peer-checked:bg-foreground peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foreground" />
          <span className="absolute left-[3px] h-[18px] w-[18px] rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-[20px]" />
        </label>
      </div>

      {config.enabled && (
        <div className="mt-4">
          <div className="mb-2.5 flex flex-wrap gap-2">
            {primaryOptions.map((c) => (
              <ChannelChip
                key={c}
                selected={c === config.primary.channel}
                label={channelLabel(c)}
                onSelect={() => onChange({ ...config, primary: { channel: c, value: "" } })}
              />
            ))}
          </div>
          <input
            type={CHANNEL_META[config.primary.channel].inputType}
            value={config.primary.value}
            onChange={(e) =>
              onChange({ ...config, primary: { ...config.primary, value: e.target.value } })
            }
            placeholder={channelPlaceholder(config.primary.channel)}
            className="ed-input"
          />
          {config.primary.verified === false && (
            <UnverifiedNotice>{unverifiedText(config.primary.channel)}</UnverifiedNotice>
          )}
          {primaryHint}

          {config.backup ? (
            <div className="mt-3 rounded-lg border border-dashed border-tile-line p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="ed-field-label">{backupLabel}</span>
                <button
                  type="button"
                  onClick={() => onChange({ ...config, backup: null })}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  {removeLabel}
                </button>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {backupOptions.map((c) => (
                  <ChannelChip
                    key={c}
                    selected={c === config.backup?.channel}
                    label={channelLabel(c)}
                    onSelect={() => onChange({ ...config, backup: { channel: c, value: "" } })}
                  />
                ))}
              </div>
              <input
                type={CHANNEL_META[config.backup.channel].inputType}
                value={config.backup.value}
                onChange={(e) =>
                  config.backup &&
                  onChange({ ...config, backup: { ...config.backup, value: e.target.value } })
                }
                placeholder={channelPlaceholder(config.backup.channel)}
                className="ed-input"
              />
              {config.backup.verified === false && (
                <UnverifiedNotice>{unverifiedText(config.backup.channel)}</UnverifiedNotice>
              )}
              {backupHint}
            </div>
          ) : (
            backupOptions.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  onChange({ ...config, backup: { channel: backupOptions[0], value: "" } })
                }
                className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
              >
                {addBackupLabel}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

interface Props {
  open: boolean;
  heirLabel: string;
  initialConfig: NotificationsConfig;
  saving?: boolean;
  onClose: () => void;
  onSave: (config: NotificationsConfig) => void;
}

const NotificationsDialog: React.FC<Props> = ({
  open,
  heirLabel,
  initialConfig,
  saving,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation("app");
  const [config, setConfig] = useState<NotificationsConfig>(initialConfig);

  useEffect(() => {
    if (open) setConfig(initialConfig);
  }, [open, initialConfig]);

  const channelLabel = (c: ReminderChannel) => {
    if (c === "email") return t("notifications.channelEmail");
    if (c === "telegram") return t("notifications.channelTelegram");
    if (c === "whatsapp") return t("notifications.channelWhatsapp");
    return t("notifications.channelSms");
  };
  const channelPlaceholder = (c: ReminderChannel) => {
    if (c === "email") return t("notifications.placeholderEmail");
    if (c === "telegram") return t("notifications.placeholderTelegram");
    return t("notifications.placeholderPhone");
  };
  const unverifiedText = (c: ReminderChannel) =>
    c === "telegram"
      ? t("notifications.unverifiedTelegram")
      : t("notifications.unverified", { channel: channelLabel(c) });

  // Heir Telegram warning — shown when the heir has Telegram selected (primary or backup).
  // Amber styling matches the UnverifiedNotice so it doesn't blend into the background.
  const heirTgWarning = (sel: { channel: ReminderChannel; value: string }) =>
    sel.channel === "telegram" && sel.value ? (
      <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-700">
        <Send className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        {t("notifications.heirTelegramWarning", { name: heirLabel })}
      </p>
    ) : null;

  return (
    <Modal
      open={open}
      cap={t("notifications.title")}
      title={t("notifications.dialogTitle")}
      description={t("notifications.dialogLead")}
      size="lg"
      busy={saving}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="flat-outline"
            className="flex-1 sm:flex-none"
            onClick={onClose}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="flat"
            className="flex-1 sm:flex-none"
            onClick={() => onSave(config)}
            disabled={saving}
          >
            {saving ? t("notifications.saving") : t("notifications.save")}
          </Button>
        </>
      }
    >
      <div className="divide-y divide-tile-line">
        <RoleSection
          title={t("notifications.remindCheckIn")}
          description={t("notifications.remindCheckInDesc")}
          channels={CREATOR_CHANNELS}
          config={config.creator}
          onChange={(creator) => setConfig((c) => ({ ...c, creator }))}
          backupLabel={t("notifications.backup")}
          removeLabel={t("notifications.remove")}
          addBackupLabel={t("notifications.addBackupPlain")}
          channelLabel={channelLabel}
          channelPlaceholder={channelPlaceholder}
          unverifiedText={unverifiedText}
        />
        <RoleSection
          title={t("notifications.notifyName", { name: heirLabel })}
          description={t("notifications.notifyWhenClaimable")}
          channels={HEIR_CHANNELS}
          config={config.heir}
          onChange={(heir) => setConfig((c) => ({ ...c, heir }))}
          backupLabel={t("notifications.backup")}
          removeLabel={t("notifications.remove")}
          addBackupLabel={t("notifications.addBackupPlain")}
          channelLabel={channelLabel}
          channelPlaceholder={channelPlaceholder}
          unverifiedText={unverifiedText}
          primaryHint={heirTgWarning(config.heir.primary)}
          backupHint={config.heir.backup ? heirTgWarning(config.heir.backup) : undefined}
        />
      </div>
    </Modal>
  );
};

export default NotificationsDialog;
