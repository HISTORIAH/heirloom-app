import { BACKEND_URL } from "@/config";
import { request } from "@/lib/api";
import type {
  AddContactRequest,
  AddContactResponse,
  AddRecipientRequest,
  CreateReminderRequest,
  CreateReminderResponse,
  EstateKind,
  FetchReminderResponse,
} from "@/types/reminders";

const REMINDERS_API_BASE = `${BACKEND_URL}/v1/estates`;

// ─── Per-estate reminders ─────────────────────────────────────────

export async function fetchReminders(estateAddress: string): Promise<FetchReminderResponse> {
  return request<FetchReminderResponse>(`${REMINDERS_API_BASE}/${estateAddress}/reminders`);
}

export async function saveReminder(
  estateAddress: string,
  estateKind: EstateKind,
  recipients: AddRecipientRequest[],
): Promise<CreateReminderResponse> {
  const payload: CreateReminderRequest = { estateAddress, estateKind, recipients };
  return request<CreateReminderResponse>(`${REMINDERS_API_BASE}/${estateAddress}/reminders`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addContact(
  estateAddress: string,
  recipients: AddRecipientRequest[],
): Promise<AddContactResponse> {
  const payload: AddContactRequest = { recipients };
  return request<AddContactResponse>(`${REMINDERS_API_BASE}/${estateAddress}/add/contact`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
