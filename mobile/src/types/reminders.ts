import type { EstateKind } from "@/types/estate";

/** Backend reminder DTOs. Telegram and email deliver; SMS is accepted but not sent. */
export type ReminderChannel = "telegram" | "email" | "sms";
/** `checkInSigner`: the owner, gets "check in" reminders. `heir`: told once grace has ended. */
export type ReminderRole = "checkInSigner" | "heir";

export type AddRecipientRequest = {
  channel: ReminderChannel;
  destination: string;
  role: ReminderRole;
};

/**
 * `channel` and `role` are backend enums. Their casing depends on each enum's own serde attrs
 * (the struct's camelCase doesn't reach them), so they're read as strings and compared with
 * `sameEnum` rather than `===`.
 */
export type RecipientResponse = {
  reminderRecipientId: string;
  channel: string;
  destination: string;
  role: string;
  /** No reminders go to a contact until this is true. */
  verified: boolean;
};

/**
 * Personalises the heir alert. Every field is optional in the API; PUT replaces all three, and
 * null or blank clears one.
 */
export type HeirProfile = {
  heirName: string | null;
  /** What the heir calls the owner. Puts a familiar name in the alert so it doesn't read as phishing. */
  ownerName: string | null;
  note: string | null;
};

export type CreateReminderRequest = {
  estateKind: EstateKind;
  recipients: AddRecipientRequest[];
  heir?: HeirProfile;
};

/**
 * `message`: the backend sent something to the contact (email/SMS: "check your inbox").
 * `instruction`: nothing was sent; show `value`. For Telegram it's a t.me deep link.
 */
export type VerificationPrompt = { type: "message" } | { type: "instruction"; value: string };

export type VerificationStatus = {
  reminderRecipientId: string;
  /** Backend sends PascalCase here ("Telegram"); compare lowercased. */
  channel: string;
  prompt: VerificationPrompt;
  /** ISO 8601. The link works once and stops at this time. */
  expiresAt: string;
};

export type CreateReminderResponse = {
  reminderSubscriptionId: string;
  /** Can be empty even on 201 if verification hit a transient error: offer resend. */
  verifications: VerificationStatus[];
};

export type AddContactResponse = {
  recipientId: string;
  verifications: VerificationStatus[];
};

export type FetchReminderResponse = {
  estateAddress: string;
  recipients: RecipientResponse[];
  heir: HeirProfile | null;
};

/** An email code, typed or from the link. Owner only: 403 means another wallet is signed in. */
export type VerifyEmailRequest = {
  code: string;
};

export type VerifyEmailResponse = {
  ok: true;
};

/** One role's contact on one estate. */
export type ContactState =
  | { kind: "none" }
  | { kind: "waiting"; recipient: RecipientResponse }
  | { kind: "connected"; recipient: RecipientResponse };

/** `locked`: no session yet, the owner has to sign in to see or change reminders. */
export type RemindersStatus = "loading" | "locked" | "ready" | "error";

/** One stop on the reminder timeline. `phase` picks its colour: before due, in grace, heir told. */
export type TimelineStop = {
  title: string;
  sub: string;
  phase: "check-in" | "grace" | "heir";
};

/** One estate's reminders as the Alerts tab and estate screen read them. */
export type EstateReminders = {
  estateAddress: string;
  recipients: RecipientResponse[];
  status: RemindersStatus;
};

/** Something on one estate the owner should act on, from the chain or from its reminders. */
export type AttentionItem = {
  key: string;
  estateAddress: string;
  estateName: string;
  text: string;
  action: "check-in" | "reminders";
  actionLabel: string;
  /** Fill: the estate's state colour for check-in items, paper for reminder gaps. */
  fill: string;
};

/** A verification on screen, for the contact it belongs to. */
export type PendingVerification = {
  recipientId: string;
  role: ReminderRole;
  channel: ReminderChannel;
  destination: string;
  /** False when `verifications` came back empty: sending failed for now, so offer resend. */
  sent: boolean;
  /** Telegram only: the t.me link to open or share. */
  link?: string;
  /** Epoch ms. Absent when we didn't just send it (an email code already in the inbox). */
  expiresAt?: number;
};

/** One role's contact as it's typed on the reminders form. Blank `value` means none is added. */
export type ContactDraft = {
  channel: ReminderChannel;
  /** Telegram @username or email. */
  value: string;
  /** The heir's email typed a second time. */
  again: string;
};

/**
 * The reminders form in one submit: the new contacts, and the heir profile when it's set up or
 * edited. Without a subscription this turns reminders on; with one, it adds to it.
 */
export type RemindersSubmit = {
  hasSubscription: boolean;
  contacts: AddRecipientRequest[];
  heir?: HeirProfile;
};
