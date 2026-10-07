import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addContact,
  fetchReminders,
  resendVerification,
  saveHeirProfile,
  saveReminder,
  verifyEmailCode,
} from "@/services/api/reminders";
import type {
  AddContactResponse,
  AddRecipientRequest,
  CreateReminderResponse,
  FetchReminderResponse,
  HeirProfile,
  VerificationStatus,
  VerifyEmailResponse,
} from "@/types/reminders";
import type { EstateKind } from "@/types/estate";
import { REMINDER_POLL_MS } from "@/lib/constants";

// ─── Queries ──────────────────────────────────────────────────────

/**
 * `poll` while a verification link is on screen: Telegram verifies out of band and nothing is
 * pushed, so we look. Always re-fetches on focus, since people come back from Telegram.
 */
export function useReminders(estateAddress: string, { poll = false }: { poll?: boolean } = {}) {
  return useQuery<FetchReminderResponse>({
    queryKey: ["reminders", estateAddress],
    queryFn: () => fetchReminders(estateAddress),
    enabled: !!estateAddress,
    retry: false,
    refetchOnWindowFocus: "always",
    refetchInterval: poll ? REMINDER_POLL_MS : false,
  });
}

// ─── Mutations ────────────────────────────────────────────────────

export function useSaveReminder(estateAddress: string) {
  const queryClient = useQueryClient();
  return useMutation<
    CreateReminderResponse,
    Error,
    { estateKind: EstateKind; recipients: AddRecipientRequest[]; heir?: HeirProfile }
  >({
    mutationFn: ({ estateKind, recipients, heir }) =>
      saveReminder(estateAddress, estateKind, recipients, heir),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", estateAddress] });
    },
  });
}

export function useSaveHeirProfile(estateAddress: string) {
  const queryClient = useQueryClient();
  return useMutation<HeirProfile, Error, HeirProfile>({
    mutationFn: (heir) => saveHeirProfile(estateAddress, heir),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", estateAddress] });
    },
  });
}

export function useVerifyEmail(estateAddress: string) {
  const queryClient = useQueryClient();
  return useMutation<VerifyEmailResponse, Error, { code: string }>({
    mutationFn: ({ code }) => verifyEmailCode(estateAddress, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", estateAddress] });
    },
  });
}

/** One contact per call — the backend has no batch add. */
export function useAddContact(estateAddress: string) {
  const queryClient = useQueryClient();
  return useMutation<AddContactResponse, Error, { recipient: AddRecipientRequest }>({
    mutationFn: ({ recipient }) => addContact(estateAddress, recipient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", estateAddress] });
    },
  });
}

export function useResendVerification(estateAddress: string) {
  const queryClient = useQueryClient();
  return useMutation<VerificationStatus, Error, { recipientId: string }>({
    mutationFn: ({ recipientId }) => resendVerification(estateAddress, recipientId),
    // Settled, not success: a 409 means it's already verified, and the list should show that.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", estateAddress] });
    },
  });
}
