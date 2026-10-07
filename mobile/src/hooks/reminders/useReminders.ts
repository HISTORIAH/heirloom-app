import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";

import { BACKEND_URL } from "@/config";
import { REMINDER_POLL_MS } from "@/constants/alerts";
import { useSession } from "@/hooks/auth/useSession";
import {
  cleanProfile,
  isUnauthorized,
  reminderError,
  telegramHandle,
  telegramLink,
} from "@/lib/reminders";
import { ApiError } from "@/services/api/request";
import {
  addContact,
  createReminders,
  fetchReminders,
  resendVerification,
  saveHeirProfile,
  verifyEmailCode,
} from "@/services/api/reminders";
import type {
  FetchReminderResponse,
  HeirProfile,
  NewContact,
  PendingVerification,
  RemindersStatus,
  ReminderChannel,
  ReminderRole,
  VerificationStatus,
} from "@/types/reminders";

const remindersKey = (estateAddress: string) => ["reminders", estateAddress];

function statusOf(query: {
  isPending: boolean;
  isError: boolean;
  error: unknown;
}): RemindersStatus {
  if (query.isError) return isUnauthorized(query.error) ? "locked" : "error";
  return query.isPending ? "loading" : "ready";
}

function pendingFrom(
  verification: VerificationStatus | undefined,
  fallback: {
    recipientId?: string;
    role: ReminderRole;
    channel: ReminderChannel;
    destination: string;
  },
): PendingVerification | undefined {
  const recipientId = verification?.reminderRecipientId ?? fallback.recipientId;
  if (recipientId === undefined) return undefined;
  return {
    recipientId,
    role: fallback.role,
    channel: fallback.channel,
    destination: fallback.destination,
    sent: verification !== undefined,
    link: verification === undefined ? undefined : telegramLink(verification),
    expiresAt: verification === undefined ? undefined : Date.parse(verification.expiresAt),
  };
}

/**
 * One estate's reminder contacts and heir profile. `poll` re-fetches while a verification is on
 * screen: the backend doesn't push when a contact verifies, so we look. Also re-fetches on app focus.
 */
export function useReminders(estateAddress: string, { poll = false }: { poll?: boolean } = {}) {
  const query = useQuery<FetchReminderResponse>({
    queryKey: remindersKey(estateAddress),
    queryFn: () => fetchReminders(estateAddress),
    enabled: BACKEND_URL !== undefined,
    retry: false,
    refetchInterval: poll ? REMINDER_POLL_MS : false,
  });
  const { refetch } = query;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  return {
    recipients: query.data?.recipients ?? [],
    heir: query.data?.heir ?? null,
    status: statusOf(query),
    error: query.isError ? reminderError(query.error) : undefined,
    refetch,
  };
}

/** Reminders for every estate at once, for the Alerts overview. */
export function useRemindersFor(estateAddresses: string[]) {
  const queries = useQueries({
    queries: estateAddresses.map((estateAddress) => ({
      queryKey: remindersKey(estateAddress),
      queryFn: () => fetchReminders(estateAddress),
      enabled: BACKEND_URL !== undefined,
      retry: false,
    })),
  });
  return estateAddresses.map((estateAddress, i) => ({
    estateAddress,
    recipients: queries[i]?.data?.recipients ?? [],
    status: queries[i] === undefined ? ("loading" as const) : statusOf(queries[i]),
  }));
}

/**
 * Adds one contact: the first one turns reminders on (POST /reminders, with the heir profile),
 * later ones go through add/contact. Resolves with the verification to put on screen.
 */
export function useAddReminderContact(estateAddress: string) {
  const queryClient = useQueryClient();
  const { withSession } = useSession();
  return useMutation({
    mutationFn: async ({
      role,
      channel,
      destination: typed,
      heir,
      hasSubscription,
    }: NewContact & { hasSubscription: boolean }): Promise<PendingVerification | undefined> => {
      const destination =
        channel === "telegram" ? telegramHandle(typed) : typed.trim().toLowerCase();
      const recipient = { channel, destination, role };
      const viaAdd = async () => {
        const res = await withSession(() => addContact(estateAddress, recipient));
        return pendingFrom(res.verifications[0], {
          recipientId: res.recipientId,
          role,
          channel,
          destination,
        });
      };
      if (hasSubscription) return viaAdd();
      try {
        const res = await withSession(() => createReminders(estateAddress, [recipient], heir));
        return pendingFrom(res.verifications[0], { role, channel, destination });
      } catch (cause) {
        // Our list was empty but the estate already has a subscription (made elsewhere, or a list
        // we couldn't read): add the contact to it instead. Its profile stays as it was; the
        // profile card edits it.
        if (cause instanceof ApiError && cause.code === "CONFLICT") return viaAdd();
        throw cause;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: remindersKey(estateAddress) }),
  });
}

/** A fresh link or code for an unverified contact. Resolves undefined if it turned out to be verified. */
export function useResendVerification(estateAddress: string) {
  const queryClient = useQueryClient();
  const { withSession } = useSession();
  return useMutation({
    mutationFn: async (
      contact: Pick<PendingVerification, "recipientId" | "role" | "channel" | "destination">,
    ): Promise<PendingVerification | undefined> => {
      try {
        const verification = await withSession(() =>
          resendVerification(estateAddress, contact.recipientId),
        );
        return pendingFrom(verification, contact);
      } catch (cause) {
        // 409 here means it was verified in the meantime: nothing to resend, the re-fetch shows it.
        if (cause instanceof ApiError && cause.code === "CONFLICT") return undefined;
        throw cause;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: remindersKey(estateAddress) }),
  });
}

/** Saves all three heir profile fields; blank clears one. 404 until reminders are set up. */
export function useSaveHeirProfile(estateAddress: string) {
  const queryClient = useQueryClient();
  const { withSession } = useSession();
  return useMutation({
    mutationFn: (heir: HeirProfile) =>
      withSession(() => saveHeirProfile(estateAddress, cleanProfile(heir))),
    onSettled: () => queryClient.invalidateQueries({ queryKey: remindersKey(estateAddress) }),
  });
}

/** Checks an email code. 403 means the signed-in wallet doesn't own the estate. */
export function useVerifyEmail(estateAddress: string) {
  const queryClient = useQueryClient();
  const { withSession } = useSession();
  return useMutation({
    mutationFn: (code: string) => withSession(() => verifyEmailCode(estateAddress, code)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: remindersKey(estateAddress) }),
  });
}
