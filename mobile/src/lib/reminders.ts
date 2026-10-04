import { ApiError } from "@/services/api/request";
import type {
  ContactState,
  RecipientResponse,
  ReminderRole,
  VerificationStatus,
} from "@/types/reminders";

/** "@Alice " → "alice". The bot matches without case or the leading @. */
export function telegramHandle(text: string): string {
  return text.trim().replace(/^@/, "");
}

/**
 * Backend enum values compared loosely: "CheckInSigner", "checkInSigner" and "check_in_signer"
 * are the same role; "Telegram" and "telegram" the same channel.
 */
export function sameEnum(a: string, b: string): boolean {
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return key(a) === key(b);
}

/** The t.me deep link in a Telegram verification, as an https URL. */
export function telegramLink(verification: VerificationStatus): string | undefined {
  if (!sameEnum(verification.channel, "telegram")) return undefined;
  if (verification.prompt.type !== "instruction") return undefined;
  const text = verification.prompt.value.trim();
  if (text.startsWith("https://t.me/")) return text;
  if (text.startsWith("t.me/")) return `https://${text}`;
  return undefined;
}

/** This role's Telegram contact, if any. */
export function contactState(recipients: RecipientResponse[], role: ReminderRole): ContactState {
  const recipient = recipients.find(
    (r) => sameEnum(r.role, role) && sameEnum(r.channel, "telegram"),
  );
  if (recipient === undefined) return { kind: "none" };
  return recipient.verified ? { kind: "connected", recipient } : { kind: "waiting", recipient };
}

/** On once the owner has a connected contact: that's who check-in reminders reach. */
export function remindersOn(recipients: RecipientResponse[]): boolean {
  return contactState(recipients, "check_in_signer").kind === "connected";
}

function channelsFor(recipients: RecipientResponse[], role: ReminderRole): string[] {
  const names = recipients
    .filter((r) => sameEnum(r.role, role))
    .map((r) => r.channel.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()));
  return [...new Set(names)];
}

/** "You: Telegram · Heir: Telegram". Channel types only; the contacts themselves stay off the list. */
export function channelLine(recipients: RecipientResponse[]): string {
  const you = channelsFor(recipients, "check_in_signer");
  const heir = channelsFor(recipients, "heir");
  if (you.length === 0 && heir.length === 0) return "Not set up";
  const list = (names: string[]) => (names.length === 0 ? "not set" : names.join(", "));
  return `You: ${list(you)} · Heir: ${list(heir)}`;
}

/** No session, or it expired: sign the challenge again. */
export function isUnauthorized(cause: unknown): boolean {
  return cause instanceof ApiError && (cause.status === 401 || cause.code === "unauthorized");
}

/** Plain-language message for a reminders API failure. */
export function reminderError(cause: unknown): string {
  if (!(cause instanceof ApiError)) {
    return cause instanceof Error ? cause.message : "Something went wrong.";
  }
  switch (cause.code) {
    case "FORBIDDEN":
      return "Only the wallet that owns this estate can change its reminders.";
    case "NOT_FOUND":
      return "Reminders aren't set up for this estate yet.";
    case "CONFLICT":
      return "That contact is already set up.";
    case "BAD_REQUEST":
      return cause.message || "Check the username and try again.";
    case "BAD_GATEWAY":
      return "Couldn't read the estate on-chain. Try again in a moment.";
    case "SERVICE_UNAVAILABLE":
      return "Reminders are unavailable right now. Try again later.";
    default:
      return cause.message || "Something went wrong.";
  }
}
