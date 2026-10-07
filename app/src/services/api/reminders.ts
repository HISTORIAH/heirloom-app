import { BACKEND_URL } from "@/config";
import { ApiError, requestRaw } from "@/lib/api";
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
import type { EstateKind } from "@/types/estate";

const ESTATES_API_BASE = `${BACKEND_URL}/v1/estates`;

/** Every reminders endpoint lives under /v1/estates/{estateAddress}/reminders. */
function remindersUrl(estateAddress: string, path = ""): string {
  return `${ESTATES_API_BASE}/${estateAddress}/reminders${path}`;
}

// ─── Per-estate reminders ─────────────────────────────────────────

// Unlike the other reminder endpoints, GET returns the resource directly — not wrapped in { data }.
export async function fetchReminders(estateAddress: string): Promise<FetchReminderResponse> {
  try {
    return await requestRaw<FetchReminderResponse>(remindersUrl(estateAddress));
  } catch (err) {
    // No subscription yet reads as no contacts, not as a failure.
    if (err instanceof ApiError && err.code === "NOT_FOUND")
      return { estateAddress, recipients: [], heir: null };
    throw err;
  }
}

export async function saveReminder(
  estateAddress: string,
  estateKind: EstateKind,
  recipients: AddRecipientRequest[],
  heir?: HeirProfile,
): Promise<CreateReminderResponse> {
  const payload: CreateReminderRequest = { estateKind, recipients, heir };
  return requestRaw<CreateReminderResponse>(remindersUrl(estateAddress), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Adds one contact to an existing subscription. 404 if the estate has no subscription yet. */
export async function addContact(
  estateAddress: string,
  recipient: AddRecipientRequest,
): Promise<AddContactResponse> {
  return requestRaw<AddContactResponse>(remindersUrl(estateAddress, "/add/contact"), {
    method: "POST",
    body: JSON.stringify(recipient),
  });
}

// ─── Heir profile ─────────────────────────────────────────────────

/** Saves the heir profile. Replaces all three fields — send null/blank to clear. 404 until reminders exist. */
export async function saveHeirProfile(
  estateAddress: string,
  heir: HeirProfile,
): Promise<HeirProfile> {
  return requestRaw<HeirProfile>(remindersUrl(estateAddress, "/heir"), {
    method: "PUT",
    body: JSON.stringify(heir),
  });
}

// ─── Verification ─────────────────────────────────────────────────

/** Verifies an email address with a code (from the link or typed). */
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

/** Resend verification for an existing recipient. Returns a fresh prompt with a new code. */
export async function resendVerification(
  estateAddress: string,
  recipientId: string,
): Promise<VerificationStatus> {
  return requestRaw<VerificationStatus>(
    remindersUrl(estateAddress, `/recipients/${recipientId}/resend`),
    { method: "POST" },
  );
}
