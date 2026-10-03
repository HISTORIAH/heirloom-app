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

export type RecipientResponse = AddRecipientRequest & {
  reminderRecipientId: string;
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
