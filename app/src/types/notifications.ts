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

type Translate = (key: string, opts?: Record<string, string>) => string;

const CHANNEL_KEYS: Record<NotificationChannel, string> = {
  email: "notifications.channelEmail",
  telegram: "notifications.channelTelegram",
  whatsapp: "notifications.channelWhatsapp",
  sms: "notifications.channelSms",
};

export function summarizeNotifications(
  config: NotificationsConfig,
  heirLabel: string,
  t: Translate,
): string {
  const parts: string[] = [];
  if (config.creator.enabled) {
    const channel = t(CHANNEL_KEYS[config.creator.primary.channel]);
    parts.push(
      t(config.creator.backup ? "notifications.summaryYouPlus" : "notifications.summaryYou", { channel }),
    );
  }
  if (config.heir.enabled) {
    const channel = t(CHANNEL_KEYS[config.heir.primary.channel]);
    parts.push(
      t(config.heir.backup ? "notifications.summaryHeirPlus" : "notifications.summaryHeir", {
        name: heirLabel,
        channel,
      }),
    );
  }
  return parts.join(" · ");
}
