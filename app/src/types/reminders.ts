export type ReminderChannel = "email" | "sms" | "whatsapp" | "telegram";
export type ReminderRole = "check_in_signer" | "heir";

export type AddRecipientRequest = {
  channel: ReminderChannel;
  destination: string; // plaintext in the request; sealed server-side
  role: ReminderRole;
};

export type RecipientResponse = AddRecipientRequest & {
  verified: boolean; // destination is decrypted by the server in responses
};

// is it from ika or heirloom program
export type EstateKind = "heirloom" | "ika";

export type CreateReminderRequest = {
  estateAddress: string;
  estateKind: EstateKind;
  recipients: AddRecipientRequest[]; // 1–2 items max
};

export type VerificationStatus = {
  reminderRecipientId: string; // uuid
  channel: ReminderChannel;
  prompt: string;
  expiresAt: string; // ISO 8601
};

export type CreateReminderResponse = {
  reminderSubscriptionId: string; // uuid
  verifications: VerificationStatus[];
};

export type AddContactRequest = {
  recipients: AddRecipientRequest[];
};

export type AddContactResponse = {
  recipientIds: string[]; // uuid[]
  verifications: VerificationStatus[];
};

export type FetchReminderResponse = {
  estateAddress: string;
  recipients: RecipientResponse[];
};

// ─── UI-specific types ────────────────────────────────────────────

export type ChannelSelection = {
  channel: ReminderChannel;
  value: string;
};

export type RoleNotificationConfig = {
  enabled: boolean;
  primary: ChannelSelection;
  backup: ChannelSelection | null;
};

export type NotificationsConfig = {
  creator: RoleNotificationConfig;
  heir: RoleNotificationConfig;
};

export type NotificationsCardStatus =
  "loading" | "locked" | "off" | "authorized" | "expired" | "error";

export const CREATOR_CHANNELS: ReminderChannel[] = ["email", "telegram", "whatsapp"];
export const HEIR_CHANNELS: ReminderChannel[] = ["email", "sms", "whatsapp", "telegram"];

export const CHANNEL_META: Record<
  ReminderChannel,
  { label: string; placeholder: string; inputType: "email" | "text" | "tel" }
> = {
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

const CHANNEL_KEYS: Record<ReminderChannel, string> = {
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
      t(config.creator.backup ? "notifications.summaryYouPlus" : "notifications.summaryYou", {
        channel,
      }),
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

/** Flatten a NotificationsConfig into the backend's AddRecipientRequest list (max 2). */
export function toAddRecipientRequests(config: NotificationsConfig): AddRecipientRequest[] {
  const recipients: AddRecipientRequest[] = [];
  if (config.creator.enabled && config.creator.primary.value) {
    recipients.push({
      channel: config.creator.primary.channel,
      destination: config.creator.primary.value,
      role: "check_in_signer",
    });
  }
  if (config.heir.enabled && config.heir.primary.value) {
    recipients.push({
      channel: config.heir.primary.channel,
      destination: config.heir.primary.value,
      role: "heir",
    });
  }
  return recipients;
}
