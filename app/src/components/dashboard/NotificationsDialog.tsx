import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type NotificationsConfig,
  type RoleNotificationConfig,
  type NotificationChannel,
  CREATOR_CHANNELS,
  HEIR_CHANNELS,
  CHANNEL_META,
} from "@/types/notifications";

interface RoleSectionProps {
  title: string;
  description: string;
  channels: NotificationChannel[];
  config: RoleNotificationConfig;
  onChange: (next: RoleNotificationConfig) => void;
}

const RoleSection: React.FC<RoleSectionProps> = ({ title, description, channels, config, onChange }) => {
  const primaryOptions = channels.filter((c) => c !== config.backup?.channel);
  const backupOptions = channels.filter((c) => c !== config.primary.channel);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 py-3.5">
        <div>
          <div className="text-sm font-extrabold">{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
        <label className="relative inline-flex h-[27px] w-[46px] shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            className="peer sr-only"
          />
          <span className="absolute inset-0 rounded-full border-[3px] border-foreground bg-gray-200 transition-colors peer-checked:bg-accent-lime peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foreground" />
          <span className="absolute left-[2px] h-[17px] w-[17px] rounded-full border-2 border-foreground bg-background transition-transform peer-checked:translate-x-[19px]" />
        </label>
      </div>

      {config.enabled && (
        <div className="pb-4">
          <div className="flex flex-wrap gap-2 mb-2.5">
            {primaryOptions.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ ...config, primary: { channel: c, value: "" } })}
                className={cn(
                  "border-[3px] border-foreground rounded-full px-4 py-2 text-xs font-extrabold transition-all",
                  c === config.primary.channel
                    ? "bg-accent-cyan shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                    : "bg-background hover:bg-secondary"
                )}
              >
                {CHANNEL_META[c].label}
              </button>
            ))}
          </div>
          <input
            type={CHANNEL_META[config.primary.channel].inputType}
            value={config.primary.value}
            onChange={(e) => onChange({ ...config, primary: { ...config.primary, value: e.target.value } })}
            placeholder={CHANNEL_META[config.primary.channel].placeholder}
            className="neo-input w-full text-sm"
          />

          {config.backup ? (
            <div className="mt-3 p-3 border-2 border-dashed border-foreground/20 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  Backup
                </span>
                <button
                  type="button"
                  onClick={() => onChange({ ...config, backup: null })}
                  className="text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {backupOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange({ ...config, backup: { channel: c, value: "" } })}
                    className={cn(
                      "border-2 border-foreground rounded-full px-3 py-1.5 text-[11px] font-extrabold",
                      c === config.backup?.channel ? "bg-accent-cyan" : "bg-background hover:bg-secondary"
                    )}
                  >
                    {CHANNEL_META[c].label}
                  </button>
                ))}
              </div>
              <input
                type={CHANNEL_META[config.backup.channel].inputType}
                value={config.backup.value}
                onChange={(e) =>
                  config.backup && onChange({ ...config, backup: { ...config.backup, value: e.target.value } })
                }
                placeholder={CHANNEL_META[config.backup.channel].placeholder}
                className="neo-input w-full text-sm"
              />
            </div>
          ) : (
            backupOptions.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...config, backup: { channel: backupOptions[0], value: "" } })}
                className="mt-2.5 text-[11px] font-extrabold uppercase tracking-wide text-accent-purple hover:underline"
              >
                + Add backup channel
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
  const [config, setConfig] = useState<NotificationsConfig>(initialConfig);

  useEffect(() => {
    if (open) setConfig(initialConfig);
  }, [open, initialConfig]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-6"
      onClick={() => !saving && onClose()}
    >
      <div
        className="neo-card-static max-w-lg w-full neo-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-start gap-3">
            <div className="bg-accent-cyan neo-border rounded-xl p-3 shrink-0">
              <Bell className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl leading-tight">Notifications</h3>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                Flip on what you want. Nothing here affects the estate itself.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="neo-border rounded-lg p-2 bg-secondary hover:bg-secondary/70 transition-colors shrink-0 disabled:opacity-50"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <RoleSection
          title="Remind me before expiry"
          description="A heads-up before your heartbeat is due"
          channels={CREATOR_CHANNELS}
          config={config.creator}
          onChange={(creator) => setConfig((c) => ({ ...c, creator }))}
        />

        <div className="h-0.5 bg-secondary" />

        <RoleSection
          title={`Notify ${heirLabel} at unlock`}
          description="Let them know the moment funds are claimable"
          channels={HEIR_CHANNELS}
          config={config.heir}
          onChange={(heir) => setConfig((c) => ({ ...c, heir }))}
        />

        <div className="flex gap-3 mt-6 pt-4 border-t-2 border-foreground/10">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="cyan" className="flex-1" onClick={() => onSave(config)} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsDialog;
