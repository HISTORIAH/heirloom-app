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
  sameEnum,
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
  PendingVerification,
  RemindersStatus,
  RemindersSubmit,
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
 * screen: the backend doesn't push when a contact verifies, so we look, and once more on coming
 * back to the app (from Telegram or the mail app). Without `poll`, returning to the app doesn't
 * refetch: every wallet signature leaves and re-enters the app.
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
    if (!poll) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refetch();
    });
    return () => sub.remove();
  }, [poll, refetch]);

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
 * Saves the whole reminders form at once. Without a subscription, one POST /reminders turns them on
 * with every contact and the heir profile; with one, each contact goes through add/contact and the
 * profile through PUT. Resolves with the verifications to put on screen, the owner's first.
 */
export function useSaveReminders(estateAddress: string) {
  const queryClient = useQueryClient();
  const { withSession } = useSession();
  return useMutation({
    mutationFn: async ({
      hasSubscription,
      contacts,
      heir,
    }: RemindersSubmit): Promise<PendingVerification[]> => {
      const recipients = contacts.map((c) => ({
        ...c,
        destination:
          c.channel === "telegram"
            ? telegramHandle(c.destination)
            : c.destination.trim().toLowerCase(),
      }));
      const profile = heir === undefined ? undefined : cleanProfile(heir);

      const viaAdd = async () => {
        const out: PendingVerification[] = [];
        for (const recipient of recipients) {
          const res = await withSession(() => addContact(estateAddress, recipient));
          const pending = pendingFrom(res.verifications[0], {
            recipientId: res.recipientId,
            ...recipient,
          });
          if (pending !== undefined) out.push(pending);
        }
        if (profile !== undefined) {
          await withSession(() => saveHeirProfile(estateAddress, profile));
        }
        return out;
      };

      let out: PendingVerification[];
      if (hasSubscription) {
        out = await viaAdd();
      } else {
        try {
          const res = await withSession(() => createReminders(estateAddress, recipients, profile));
          // Verifications carry the recipient id but not its role or contact: read them back.
          const saved = await withSession(() => fetchReminders(estateAddress));
          queryClient.setQueryData(remindersKey(estateAddress), saved);
          out = res.verifications.flatMap((verification) => {
            const r = saved.recipients.find(
              (item) => item.reminderRecipientId === verification.reminderRecipientId,
            );
            if (r === undefined) return [];
            const pending = pendingFrom(verification, {
              recipientId: r.reminderRecipientId,
              role: sameEnum(r.role, "heir") ? "heir" : "checkInSigner",
              channel: sameEnum(r.channel, "email") ? "email" : "telegram",
              destination: r.destination,
            });
            return pending === undefined ? [] : [pending];
          });
        } catch (cause) {
          // Our list was empty but the estate already has a subscription (made elsewhere, or a
          // list we couldn't read): add to it instead.
          if (cause instanceof ApiError && cause.code === "CONFLICT") out = await viaAdd();
          else throw cause;
        }
      }
      return out.sort((a, b) => Number(a.role === "heir") - Number(b.role === "heir"));
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

/** Checks an email code. 403 means the signed-in wallet doesn't own the estate. */
export function useVerifyEmail(estateAddress: string) {
  const queryClient = useQueryClient();
  const { withSession } = useSession();
  return useMutation({
    mutationFn: (code: string) => withSession(() => verifyEmailCode(estateAddress, code)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: remindersKey(estateAddress) }),
  });
}
