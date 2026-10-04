import type { EstateKind } from "@/types/estate";

/** Backend reminder DTOs. Only Telegram delivers today; email/SMS are accepted but not sent. */
export type ReminderChannel = "telegram" | "email" | "sms";
/** `check_in_signer`: the owner, gets "check in" reminders. `heir`: told once grace has ended. */
export type ReminderRole = "check_in_signer" | "heir";

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

export type CreateReminderRequest = {
  estateKind: EstateKind;
  recipients: AddRecipientRequest[];
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
};

/** One role's Telegram contact on one estate. */
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

/** A verification link on screen, for the contact it belongs to. */
export type PendingVerification = {
  recipientId: string;
  role: ReminderRole;
  destination: string;
  /** Absent when the backend couldn't make one (empty `verifications`); offer resend. */
  link?: string;
  /** Epoch ms. */
  expiresAt?: number;
};
