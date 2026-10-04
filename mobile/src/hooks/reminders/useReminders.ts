import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";

import { BACKEND_URL } from "@/config";
import { REMINDER_POLL_MS } from "@/constants/alerts";
import { useSession } from "@/hooks/auth/useSession";
import { isUnauthorized, reminderError, telegramHandle, telegramLink } from "@/lib/reminders";
import { ApiError } from "@/services/api/request";
import {
  addContact,
  createReminders,
  fetchReminders,
  resendVerification,
} from "@/services/api/reminders";
import type {
  FetchReminderResponse,
  PendingVerification,
  RemindersStatus,
  ReminderRole,
  VerificationStatus,
} from "@/types/reminders";

const remindersKey = (estateAddress: string) => ["reminders", estateAddress];

function statusOf(query: { isPending: boolean; isError: boolean; error: unknown }): RemindersStatus {
  if (query.isError) return isUnauthorized(query.error) ? "locked" : "error";
  return query.isPending ? "loading" : "ready";
}

function pendingFrom(
  verification: VerificationStatus | undefined,
  fallback: { recipientId?: string; role: ReminderRole; destination: string },
): PendingVerification | undefined {
  const recipientId = verification?.reminderRecipientId ?? fallback.recipientId;
  if (recipientId === undefined) return undefined;
  return {
    recipientId,
    role: fallback.role,
    destination: fallback.destination,
    link: verification === undefined ? undefined : telegramLink(verification),
    expiresAt: verification === undefined ? undefined : Date.parse(verification.expiresAt),
  };
}

/**
 * One estate's reminder contacts. `poll` re-fetches while a verification link is on screen:
 * the backend doesn't push when Telegram verifies, so we look. Also re-fetches on app focus.
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
 * Adds one Telegram contact: the first one turns reminders on (POST /reminders), later ones go
 * through add/contact. Resolves with the verification to put on screen.
 */
export function useAddReminderContact(estateAddress: string) {
  const queryClient = useQueryClient();
  const { withSession } = useSession();
  return useMutation({
    mutationFn: async ({
      role,
      username,
      hasSubscription,
    }: {
      role: ReminderRole;
      username: string;
      hasSubscription: boolean;
    }): Promise<PendingVerification | undefined> => {
      const destination = telegramHandle(username);
      const recipient = { channel: "telegram" as const, destination, role };
      const viaAdd = async () => {
        const res = await withSession(() => addContact(estateAddress, recipient));
        return pendingFrom(res.verifications[0], { recipientId: res.recipientId, role, destination });
      };
      if (hasSubscription) return viaAdd();
      try {
        const res = await withSession(() => createReminders(estateAddress, [recipient]));
        return pendingFrom(res.verifications[0], { role, destination });
      } catch (cause) {
        // Our list was empty but the estate already has a subscription (made elsewhere, or a list
        // we couldn't read): add the contact to it instead.
        if (cause instanceof ApiError && cause.code === "CONFLICT") return viaAdd();
        throw cause;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: remindersKey(estateAddress) }),
  });
}

/** A fresh link for an unverified contact. Resolves undefined if it turned out to be verified. */
export function useResendVerification(estateAddress: string) {
  const queryClient = useQueryClient();
  const { withSession } = useSession();
  return useMutation({
    mutationFn: async ({
      recipientId,
      role,
      destination,
    }: {
      recipientId: string;
      role: ReminderRole;
      destination: string;
    }): Promise<PendingVerification | undefined> => {
      try {
        const verification = await withSession(() =>
          resendVerification(estateAddress, recipientId),
        );
        return pendingFrom(verification, { recipientId, role, destination });
      } catch (cause) {
        // 409 here means it was verified in the meantime: nothing to resend, the re-fetch shows it.
        if (cause instanceof ApiError && cause.code === "CONFLICT") return undefined;
        throw cause;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: remindersKey(estateAddress) }),
  });
}
