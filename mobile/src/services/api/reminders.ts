import { BACKEND_URL } from "@/config";
import { ApiError, requestRaw } from "@/services/api/request";
import type {
  AddContactResponse,
  AddRecipientRequest,
  CreateReminderRequest,
  CreateReminderResponse,
  FetchReminderResponse,
  VerificationStatus,
} from "@/types/reminders";

/** Every reminders endpoint lives under /v1/estates/{estateAddress}/reminders and needs the session cookie. */
function remindersUrl(estateAddress: string, path = ""): string {
  return `${BACKEND_URL}/v1/estates/${estateAddress}/reminders${path}`;
}

/** Contacts and whether each is verified. Owner only. No subscription yet reads as no contacts. */
export async function fetchReminders(estateAddress: string): Promise<FetchReminderResponse> {
  try {
    return await requestRaw<FetchReminderResponse>(remindersUrl(estateAddress));
  } catch (cause) {
    if (cause instanceof ApiError && cause.code === "NOT_FOUND") {
      return { estateAddress, recipients: [] };
    }
    throw cause;
  }
}

/** Turns reminders on. Once per estate; later contacts go through `addContact`. */
export async function createReminders(
  estateAddress: string,
  recipients: AddRecipientRequest[],
): Promise<CreateReminderResponse> {
  const payload: CreateReminderRequest = { estateKind: "heirloom", recipients };
  return requestRaw<CreateReminderResponse>(remindersUrl(estateAddress), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** One contact per call. 409 if that role already has this channel. */
export async function addContact(
  estateAddress: string,
  recipient: AddRecipientRequest,
): Promise<AddContactResponse> {
  return requestRaw<AddContactResponse>(remindersUrl(estateAddress, "/add/contact"), {
    method: "POST",
    body: JSON.stringify(recipient),
  });
}

/** A fresh link/code for an unverified contact. 409 if it's already verified. */
export async function resendVerification(
  estateAddress: string,
  recipientId: string,
): Promise<VerificationStatus> {
  return requestRaw<VerificationStatus>(
    remindersUrl(estateAddress, `/recipients/${recipientId}/resend`),
    { method: "POST" },
  );
}
