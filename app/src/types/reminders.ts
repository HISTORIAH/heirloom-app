import type { EstateKind } from "@/types/estate";

export type ReminderChannel = "email" | "sms" | "whatsapp" | "telegram";
export type ReminderRole = "check_in_signer" | "heir";

export type AddRecipientRequest = {
  channel: ReminderChannel;
  destination: string; // plaintext in the request; sealed server-side
  role: ReminderRole;
};

export type RecipientResponse = AddRecipientRequest & {
  reminderRecipientId: string; // uuid
  verified: boolean; // destination is decrypted by the server in responses
};

export type CreateReminderRequest = {
  estateKind: EstateKind;
  recipients: AddRecipientRequest[]; // 1–2 items max
};

/**
 * `message`: the backend sent something to the contact (email/SMS) — show "check your inbox".
 * `instruction`: nothing was sent — the UI must show `value`. For Telegram it's the t.me deep link.
 */
export type VerificationPrompt =
  | { type: "message" }
  | { type: "instruction"; value: string };

export type VerificationStatus = {
  reminderRecipientId: string; // uuid
  /** Backend may send PascalCase ("Telegram") — normalize with normalizeChannel() */
  channel: string;
  prompt: VerificationPrompt;
  expiresAt: string; // ISO 8601
};

/** Normalize a channel string from the backend to lowercase ReminderChannel. */
export function normalizeChannel(ch: string): ReminderChannel {
  return ch.toLowerCase() as ReminderChannel;
}

/** The text the UI must show for an `instruction` prompt; empty for `message`. */
export function verificationPromptText(prompt: VerificationPrompt): string {
  return prompt.type === "instruction" ? prompt.value : "";
}

/**
 * Extract a Telegram deep-link (t.me/…?start=…) from a verification prompt.
 * The backend returns { type: "instruction", value: "t.me/{bot}?start={code}" } for Telegram.
 * The link works once and expires at `expiresAt`; after that, call resend.
 * Returns undefined for other channels or when the prompt is not a t.me link.
 */
export function telegramVerificationLink(v: VerificationStatus): string | undefined {
  if (normalizeChannel(v.channel) !== "telegram") return undefined;
  const text = verificationPromptText(v.prompt).trim();
  if (text.startsWith("t.me/")) return `https://${text}`;
  if (text.startsWith("https://t.me/")) return text;
  return undefined;
}

export type CreateReminderResponse = {
  reminderSubscriptionId: string; // uuid
  verifications: VerificationStatus[];
};

/** POST /reminders/add/contact takes one contact per call. */
export type AddContactRequest = AddRecipientRequest;

export type AddContactResponse = {
  recipientId: string; // uuid
  /** Can be empty even on success if verification hit a transient error — offer resend. */
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
  /** Only known for a channel loaded from a saved recipient — absent for one the user is still editing. */
  verified?: boolean;
  /** Server-assigned UUID — only present for saved recipients, needed for resend. */
  recipientId?: string;
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

/**
 * Only Telegram delivers today. The API accepts email/SMS but doesn't send them, and
 * POST /reminders saves the subscription before rejecting them — offering them can leave an
 * estate stuck with a broken subscription. WhatsApp is rejected outright (400).
 */
export const CREATOR_CHANNELS: ReminderChannel[] = ["telegram"];
export const HEIR_CHANNELS: ReminderChannel[] = ["telegram"];

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
  primary: { channel: "telegram", value: "" },
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

/** Inverse of toAddRecipientRequests — rebuild UI config from the server's saved recipients. */
export function notificationsConfigFromRecipients(
  recipients: RecipientResponse[],
): NotificationsConfig {
  const config = defaultNotificationsConfig();
  for (const recipient of recipients) {
    const target = recipient.role === "heir" ? config.heir : config.creator;
    const slot = {
      channel: recipient.channel,
      value: recipient.destination,
      verified: recipient.verified,
      recipientId: recipient.reminderRecipientId,
    };
    if (!target.enabled) {
      target.enabled = true;
      target.primary = slot;
    } else {
      target.backup = slot;
    }
  }
  return config;
}

/** Flatten a NotificationsConfig into the backend's AddRecipientRequest list. */
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

/**
 * Contacts in `config` that aren't saved yet. The backend allows one contact per role+channel
 * and has no edit, so re-sending a saved one is a 409 — only new ones go to add/contact.
 */
export function newRecipientRequests(
  config: NotificationsConfig,
  saved: RecipientResponse[],
): AddRecipientRequest[] {
  const taken = new Set(saved.map((r) => `${r.role}:${normalizeChannel(r.channel)}`));
  return toAddRecipientRequests(config).filter((r) => !taken.has(`${r.role}:${r.channel}`));
}
