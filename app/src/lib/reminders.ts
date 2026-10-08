import { ApiError } from "@/lib/api";
import { EMAIL_PATTERN, TELEGRAM_USERNAME_PATTERN } from "@/lib/constants";
import {
  sameEnum,
  telegramHandle,
  telegramVerificationLink,
  type ContactDraft,
  type PendingVerification,
  type ReminderChannel,
  type ReminderRole,
  type VerificationStatus,
} from "@/types/reminders";

/** i18n key for a failed email code, typed or from the link. */
export function verifyErrorKey(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "FORBIDDEN" || err.status === 403) return "notifications.wrongWallet";
    if (err.status === 429 || err.code === "TOO_MANY_REQUESTS") {
      return "notifications.tooManyAttempts";
    }
    if (["BAD_REQUEST", "NOT_FOUND", "GONE"].includes(err.code)) return "notifications.codeInvalid";
  }
  return "verifyEmail.errorDesc";
}

/** "abcd 2345" → "ABCD2345": what the backend matches. Lookalikes are left for the pattern to reject. */
export function normalizeCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** What the backend stores: the bare Telegram handle, or the email lowercased. */
export function normalizeDestination(channel: ReminderChannel, value: string): string {
  return channel === "telegram" ? telegramHandle(value) : value.trim().toLowerCase();
}

/** Nothing typed: the form adds no contact for this role. */
export function draftBlank(draft: ContactDraft): boolean {
  return draft.value.trim().length === 0;
}

/**
 * What's wrong with a typed contact and in which field, as an i18n key, or undefined when it can be
 * saved. Only the heir's email is typed twice: the owner's is checked by the code we send.
 */
export function draftProblem(
  draft: ContactDraft,
  role: ReminderRole,
): { field: "value" | "again"; key: string } | undefined {
  if (draft.channel === "telegram") {
    return TELEGRAM_USERNAME_PATTERN.test(draft.value.trim())
      ? undefined
      : { field: "value", key: "notifications.invalidUsername" };
  }
  if (!EMAIL_PATTERN.test(draft.value.trim())) {
    return { field: "value", key: "notifications.invalidEmail" };
  }
  if (
    role === "heir" &&
    normalizeDestination("email", draft.value) !== normalizeDestination("email", draft.again)
  ) {
    return { field: "again", key: "notifications.emailMismatch" };
  }
  return undefined;
}

/** A verification from the backend, tied to the contact it belongs to. */
export function pendingFrom(
  verification: VerificationStatus | undefined,
  contact: {
    recipientId: string;
    role: ReminderRole;
    channel: ReminderChannel;
    destination: string;
  },
): PendingVerification {
  return {
    ...contact,
    sent: verification !== undefined,
    link: verification === undefined ? undefined : telegramVerificationLink(verification),
    expiresAt: verification === undefined ? undefined : Date.parse(verification.expiresAt),
  };
}

export function roleOf(role: string): ReminderRole {
  return sameEnum(role, "heir") ? "heir" : "checkInSigner";
}

export function channelOf(channel: string): ReminderChannel {
  return sameEnum(channel, "email") ? "email" : "telegram";
}

/** "4:07": what's left on a code or link. */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
