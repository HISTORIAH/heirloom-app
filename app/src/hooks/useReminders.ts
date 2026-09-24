import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addContact,
  fetchReminders,
  resendVerification,
  saveReminder,
} from "@/services/api/reminders";
import type {
  AddContactResponse,
  AddRecipientRequest,
  CreateReminderResponse,
  EstateKind,
  FetchReminderResponse,
  VerificationStatus,
} from "@/types/reminders";

// ─── Queries ──────────────────────────────────────────────────────

export function useReminders(estateAddress: string, enabled = true) {
  return useQuery<FetchReminderResponse>({
    queryKey: ["reminders", estateAddress],
    queryFn: () => fetchReminders(estateAddress),
    enabled: !!estateAddress && enabled,
    staleTime: 60_000,
    retry: false,
  });
}

// ─── Mutations ────────────────────────────────────────────────────

export function useSaveReminder(estateAddress: string) {
  const queryClient = useQueryClient();
  return useMutation<
    CreateReminderResponse,
    Error,
    { estateKind: EstateKind; recipients: AddRecipientRequest[] }
  >({
    mutationFn: ({ estateKind, recipients }) => saveReminder(estateAddress, estateKind, recipients),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", estateAddress] });
    },
  });
}

export function useAddContact(estateAddress: string) {
  const queryClient = useQueryClient();
  return useMutation<AddContactResponse, Error, { recipients: AddRecipientRequest[] }>({
    mutationFn: ({ recipients }) => addContact(estateAddress, recipients),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", estateAddress] });
    },
  });
}

export function useResendVerification(estateAddress: string) {
  const queryClient = useQueryClient();
  return useMutation<VerificationStatus, Error, { recipientId: string }>({
    mutationFn: ({ recipientId }) => resendVerification(estateAddress, recipientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", estateAddress] });
    },
  });
}
