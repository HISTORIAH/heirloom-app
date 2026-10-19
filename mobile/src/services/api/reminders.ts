import { BACKEND_URL } from "@/config";
import { getJson, isNotFound, postJson, putJson } from "@heirloom/core/api";
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
    return await getJson<FetchReminderResponse>(remindersUrl(estateAddress));
  } catch (cause) {
    if (isNotFound(cause)) {
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
  return postJson<CreateReminderResponse>(remindersUrl(estateAddress), payload);
}

/** One contact per call. 409 if that role already has this channel. */
export async function addContact(
  estateAddress: string,
  recipient: AddRecipientRequest,
): Promise<AddContactResponse> {
  return postJson<AddContactResponse>(remindersUrl(estateAddress, "/add/contact"), recipient);
}

/** Replaces all three fields; null or blank clears one. 404 until reminders are set up. */
export async function saveHeirProfile(
  estateAddress: string,
  heir: HeirProfile,
): Promise<HeirProfile> {
  return putJson<HeirProfile>(remindersUrl(estateAddress, "/heir"), heir);
}

/** A fresh link/code for an unverified contact. 409 if it's already verified. */
export async function resendVerification(
  estateAddress: string,
  recipientId: string,
): Promise<VerificationStatus> {
  return postJson<VerificationStatus>(
    remindersUrl(estateAddress, `/recipients/${recipientId}/resend`),
  );
}

/** Verifies an email contact with its code. 10 tries per wallet per 15 minutes. */
export async function verifyEmailCode(
  estateAddress: string,
  code: string,
): Promise<VerifyEmailResponse> {
  const payload: VerifyEmailRequest = { code };
  return postJson<VerifyEmailResponse>(remindersUrl(estateAddress, "/verify"), payload);
}
