import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import Sheet from "@/components/app/Sheet";
import { cn } from "@/lib/utils";
import { useTranslation } from "@heirloom/i18n";
import {
  type NotificationsConfig,
  type RoleNotificationConfig,
  type NotificationChannel,
  CREATOR_CHANNELS,
  HEIR_CHANNELS,
  CHANNEL_META,
} from "@/types/notifications";

const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  email: "notifications.channelEmail",
  telegram: "notifications.channelTelegram",
  whatsapp: "notifications.channelWhatsapp",
  sms: "notifications.channelSms",
};

const CHANNEL_PLACEHOLDER: Record<NotificationChannel, string> = {
  email: "notifications.placeholderEmail",
  telegram: "notifications.placeholderTelegram",
  whatsapp: "notifications.placeholderPhone",
  sms: "notifications.placeholderPhone",
};

interface RoleSectionProps {
  title: string;
  description: string;
  channels: NotificationChannel[];
  config: RoleNotificationConfig;
  onChange: (next: RoleNotificationConfig) => void;
}

const RoleSection: React.FC<RoleSectionProps> = ({ title, description, channels, config, onChange }) => {
  const { t } = useTranslation("app");
  const primaryOptions = channels.filter((c) => c !== config.backup?.channel);
  const backupOptions = channels.filter((c) => c !== config.primary.channel);

  return (
    <div className="border-t border-tile-line py-4 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-0.5 text-xs font-medium text-muted-foreground">{description}</div>
        </div>
        {/* The switch is the one control that has to read as on or off at a
            glance, so on is lime — the same lime that means alive elsewhere. */}
        <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            className="peer sr-only"
          />
          <span className="absolute inset-0 rounded-full border border-tile-line bg-tile-soft transition-colors peer-checked:border-accent-sage peer-checked:bg-accent-sage peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foreground" />
          <span className="absolute left-[3px] h-[18px] w-[18px] rounded-full border border-foreground bg-background transition-transform peer-checked:translate-x-[20px]" />
        </label>
      </div>

      {config.enabled && (
        <div className="mt-4">
          <div className="mb-2.5 flex flex-wrap gap-2">
            {primaryOptions.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ ...config, primary: { channel: c, value: "" } })}
                className={cn(
                  "rounded-lg border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                  c === config.primary.channel
                    ? "border-foreground bg-foreground text-background"
                    : "border-tile-line bg-background hover:bg-tile-soft"
                )}
              >
                {t(CHANNEL_LABEL[c])}
              </button>
            ))}
          </div>
          <input
            type={CHANNEL_META[config.primary.channel].inputType}
            value={config.primary.value}
            onChange={(e) => onChange({ ...config, primary: { ...config.primary, value: e.target.value } })}
            placeholder={t(CHANNEL_PLACEHOLDER[config.primary.channel])}
            className="field"
          />

          {config.backup ? (
            <div className="mt-3 rounded-lg border border-dashed border-tile-line p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="cap">
                  {t("notifications.backup")}
                </span>
                <button
                  type="button"
                  onClick={() => onChange({ ...config, backup: null })}
                  className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("notifications.remove")}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {backupOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange({ ...config, backup: { channel: c, value: "" } })}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors",
                      c === config.backup?.channel
                        ? "border-foreground bg-foreground text-background"
                        : "border-tile-line bg-background hover:bg-tile-soft"
                    )}
                  >
                    {t(CHANNEL_LABEL[c])}
                  </button>
                ))}
              </div>
              <input
                type={CHANNEL_META[config.backup.channel].inputType}
                value={config.backup.value}
                onChange={(e) =>
                  config.backup && onChange({ ...config, backup: { ...config.backup, value: e.target.value } })
                }
                placeholder={t(CHANNEL_PLACEHOLDER[config.backup.channel])}
                className="field"
              />
            </div>
          ) : (
            backupOptions.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...config, backup: { channel: backupOptions[0], value: "" } })}
                className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.14em] underline-offset-4 hover:underline"
              >
                {t("notifications.addBackup")}
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

const NotificationsDialog: React.FC<Props> = ({ open, heirLabel, initialConfig, saving, onClose, onSave }) => {
  const { t } = useTranslation("app");
  const [config, setConfig] = useState<NotificationsConfig>(initialConfig);

  useEffect(() => {
    if (open) setConfig(initialConfig);
  }, [open, initialConfig]);

  return (
    <Sheet
      open={open}
      title={t("notifications.title")}
      caption={t("dashboard.manageEstate")}
      icon={<Bell strokeWidth={2} />}
      size="lg"
      busy={saving}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
            {t("notifications.cancel")}
          </Button>
          <Button onClick={() => onSave(config)} disabled={saving} className="w-full sm:w-auto">
            {saving ? t("notifications.saving") : t("notifications.save")}
          </Button>
        </>
      }
    >
      <p className="text-sm font-medium text-muted-foreground">{t("notifications.dialogDesc")}</p>

      <div className="mt-4">
        <RoleSection
          title={t("notifications.remindTitle")}
          description={t("notifications.remindDesc")}
          channels={CREATOR_CHANNELS}
          config={config.creator}
          onChange={(creator) => setConfig((c) => ({ ...c, creator }))}
        />

        <RoleSection
          title={t("notifications.notifyTitle", { name: heirLabel })}
          description={t("notifications.notifyDesc")}
          channels={HEIR_CHANNELS}
          config={config.heir}
          onChange={(heir) => setConfig((c) => ({ ...c, heir }))}
        />
      </div>
    </Sheet>
  );
};

export default NotificationsDialog;
