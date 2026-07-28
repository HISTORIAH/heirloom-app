export type NotificationChannel = "email" | "telegram" | "whatsapp" | "sms";

export interface ChannelSelection {
  channel: NotificationChannel;
  value: string;
}

export interface RoleNotificationConfig {
  enabled: boolean;
  primary: ChannelSelection;
  backup: ChannelSelection | null;
}

export interface NotificationsConfig {
  creator: RoleNotificationConfig;
  heir: RoleNotificationConfig;
}

/** Dashboard card state — distinct from the config itself, since "not yet authorized" and "confirmed off" must never look the same. */
export type NotificationsCardStatus = "loading" | "locked" | "off" | "authorized" | "expired" | "error";

export const CREATOR_CHANNELS: NotificationChannel[] = ["email", "telegram", "whatsapp"];
export const HEIR_CHANNELS: NotificationChannel[] = ["email", "sms", "whatsapp", "telegram"];

export const CHANNEL_META: Record<NotificationChannel, { label: string; placeholder: string; inputType: "email" | "text" | "tel" }> = {
  email: { label: "Email", placeholder: "you@email.com", inputType: "email" },
  telegram: { label: "Telegram", placeholder: "@username", inputType: "text" },
  whatsapp: { label: "WhatsApp", placeholder: "+1 234 567 8900", inputType: "tel" },
  sms: { label: "SMS", placeholder: "+1 234 567 8900", inputType: "tel" },
};

export const defaultRoleConfig = (): RoleNotificationConfig => ({
  enabled: false,
  primary: { channel: "email", value: "" },
  backup: null,
});

export const defaultNotificationsConfig = (): NotificationsConfig => ({
  creator: defaultRoleConfig(),
  heir: defaultRoleConfig(),
});

export function summarizeNotifications(config: NotificationsConfig, heirLabel: string): string {
  const parts: string[] = [];
  if (config.creator.enabled) {
    parts.push(`You: ${CHANNEL_META[config.creator.primary.channel].label}${config.creator.backup ? " +1" : ""}`);
  }
  if (config.heir.enabled) {
    parts.push(`${heirLabel}: ${CHANNEL_META[config.heir.primary.channel].label}${config.heir.backup ? " +1" : ""}`);
  }
  return parts.join(" · ");
}
