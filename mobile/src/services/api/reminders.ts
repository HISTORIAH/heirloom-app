import { BACKEND_URL } from "@/config";
import { ApiError, requestRaw } from "@/services/api/request";
import type {
  AddContactResponse,
  AddRecipientRequest,
  CreateReminderRequest,
  CreateReminderResponse,
  FetchReminderResponse,
  HeirProfile,
  VerificationStatus,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from "@/types/reminders";

/** Every reminders endpoint lives under /v1/estates/{estateAddress}/reminders and needs the session cookie. */
function remindersUrl(estateAddress: string, path = ""): string {
  return `${BACKEND_URL}/v1/estates/${estateAddress}/reminders${path}`;
}

/** Contacts, whether each is verified, and the heir profile. Owner only. No subscription yet reads as empty. */
export async function fetchReminders(estateAddress: string): Promise<FetchReminderResponse> {
  try {
    return await requestRaw<FetchReminderResponse>(remindersUrl(estateAddress));
  } catch (cause) {
    if (cause instanceof ApiError && cause.code === "NOT_FOUND") {
      return { estateAddress, recipients: [], heir: null };
    }
    throw cause;
  }
}

/** Turns reminders on. Once per estate; later contacts go through `addContact`, the profile through `saveHeirProfile`. */
export async function createReminders(
  estateAddress: string,
  recipients: AddRecipientRequest[],
  heir?: HeirProfile,
): Promise<CreateReminderResponse> {
  const payload: CreateReminderRequest = { estateKind: "heirloom", recipients, heir };
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

/** Replaces all three fields; null or blank clears one. 404 until reminders are set up. */
export async function saveHeirProfile(
  estateAddress: string,
  heir: HeirProfile,
): Promise<HeirProfile> {
  return requestRaw<HeirProfile>(remindersUrl(estateAddress, "/heir"), {
    method: "PUT",
    body: JSON.stringify(heir),
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

/** Verifies an email contact with its code. 10 tries per wallet per 15 minutes. */
export async function verifyEmailCode(
  estateAddress: string,
  code: string,
): Promise<VerifyEmailResponse> {
  const payload: VerifyEmailRequest = { code };
  return requestRaw<VerifyEmailResponse>(remindersUrl(estateAddress, "/verify"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
