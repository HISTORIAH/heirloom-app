import { ApiError } from "@/lib/api";

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
