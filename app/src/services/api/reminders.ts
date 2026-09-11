import { BACKEND_URL } from "@/config";
import { request } from "@/lib/api";
import type {
  AddRecipientRequest,
  CreateReminderRequest,
  CreateReminderResponse,
  FetchReminderResponse,
} from "@/types/reminders";

const REMINDERS_API_BASE = `${BACKEND_URL}/v1/estates`;

// ─── Per-estate reminders ─────────────────────────────────────────

export async function fetchReminders(estateAddress: string): Promise<FetchReminderResponse> {
  return request<FetchReminderResponse>(`${REMINDERS_API_BASE}/${estateAddress}/reminders`);
}

export async function saveReminder(
  estateAddress: string,
  estateKind: string,
  recipients: AddRecipientRequest[],
): Promise<CreateReminderResponse> {
  const payload: CreateReminderRequest = { estateAddress, estateKind, recipients };
  return request<CreateReminderResponse>(`${REMINDERS_API_BASE}/${estateAddress}/reminders`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
