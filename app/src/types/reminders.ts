import type { EstateKind } from "@/types/estate";

export type ReminderChannel = "email" | "sms" | "whatsapp" | "telegram";
export type ReminderRole = "check_in_signer" | "heir";

export type AddRecipientRequest = {
  channel: ReminderChannel;
  destination: string; // plaintext in the request; sealed server-side
  role: ReminderRole;
};

/**
 * `channel` and `role` are backend enums whose casing comes from each enum's own serde attrs,
 * so they're read as strings and compared with `sameEnum`, never `===`.
 */
export type RecipientResponse = {
  reminderRecipientId: string; // uuid
  channel: string;
  destination: string; // decrypted by the server in responses
  role: string;
  verified: boolean;
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
  /** Backend may send PascalCase ("Telegram") — compare with sameEnum() */
  channel: string;
  prompt: VerificationPrompt;
  expiresAt: string; // ISO 8601
};

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
  if (!sameEnum(v.channel, "telegram")) return undefined;
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

// ─── UI helpers ───────────────────────────────────────────────────

/**
 * Backend enum values compared loosely: "CheckInSigner", "checkInSigner" and "check_in_signer"
 * are the same role; "Telegram" and "telegram" the same channel.
 */
export function sameEnum(a: string, b: string): boolean {
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return key(a) === key(b);
}

/** "@Alice " → "Alice". The bot matches without case or the leading @. */
export function telegramHandle(text: string): string {
  return text.trim().replace(/^@/, "");
}

/** One role's Telegram contact. Contacts can't be edited or removed, so this is read-only state. */
export type ContactState =
  | { kind: "none" }
  | { kind: "waiting"; recipient: RecipientResponse }
  | { kind: "connected"; recipient: RecipientResponse };

export function contactState(recipients: RecipientResponse[], role: ReminderRole): ContactState {
  const recipient = recipients.find(
    (r) => sameEnum(r.role, role) && sameEnum(r.channel, "telegram"),
  );
  if (!recipient) return { kind: "none" };
  return recipient.verified ? { kind: "connected", recipient } : { kind: "waiting", recipient };
}

/** `pending`: a contact is saved but not verified yet, so nothing reaches it. */
export type NotificationsCardStatus =
  | "loading"
  | "locked"
  | "off"
  | "authorized"
  | "pending"
  | "expired"
  | "error";

type Translate = (key: string, opts?: Record<string, string>) => string;

/** Card line, e.g. "You: Telegram · Sarah: waiting for Telegram". Undefined when nothing is set. */
export function summarizeReminders(
  recipients: RecipientResponse[],
  heirLabel: string,
  t: Translate,
): string | undefined {
  const channel = t("notifications.channelTelegram");
  const self = contactState(recipients, "check_in_signer");
  const heir = contactState(recipients, "heir");
  const parts: string[] = [];
  if (self.kind === "connected") parts.push(t("notifications.summaryYou", { channel }));
  if (self.kind === "waiting") parts.push(t("notifications.summaryYouWaiting"));
  if (heir.kind === "connected") parts.push(t("notifications.summaryHeir", { name: heirLabel, channel }));
  if (heir.kind === "waiting") parts.push(t("notifications.summaryHeirWaiting", { name: heirLabel }));
  return parts.length > 0 ? parts.join(" · ") : undefined;
}
