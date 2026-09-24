import { BACKEND_URL } from "@/config";
import { requestRaw } from "@/lib/api";
import type {
  AddContactRequest,
  AddContactResponse,
  AddRecipientRequest,
  CreateReminderRequest,
  CreateReminderResponse,
  EstateKind,
  FetchReminderResponse,
  VerificationStatus,
} from "@/types/reminders";

const REMINDERS_API_BASE = `${BACKEND_URL}/v1/estates`;

// ─── Per-estate reminders ─────────────────────────────────────────

// Unlike the other reminder endpoints, GET returns the resource directly — not wrapped in { data }.
export async function fetchReminders(estateAddress: string): Promise<FetchReminderResponse> {
  return requestRaw<FetchReminderResponse>(`${REMINDERS_API_BASE}/${estateAddress}/reminders`);
}

export async function saveReminder(
  estateAddress: string,
  estateKind: EstateKind,
  recipients: AddRecipientRequest[],
): Promise<CreateReminderResponse> {
  const payload: CreateReminderRequest = { estateAddress, estateKind, recipients };
  return requestRaw<CreateReminderResponse>(`${REMINDERS_API_BASE}/${estateAddress}/reminders`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addContact(
  estateAddress: string,
  recipients: AddRecipientRequest[],
): Promise<AddContactResponse> {
  const payload: AddContactRequest = { recipients };
  return requestRaw<AddContactResponse>(`${REMINDERS_API_BASE}/${estateAddress}/add/contact`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Verification ─────────────────────────────────────────────────

/** Resend verification for an existing recipient. Returns a fresh prompt with a new code. */
export async function resendVerification(
  estateAddress: string,
  recipientId: string,
): Promise<VerificationStatus> {
  return requestRaw<VerificationStatus>(
    `${REMINDERS_API_BASE}/${estateAddress}/recipients/${recipientId}/resend`,
    { method: "POST" },
  );
}
