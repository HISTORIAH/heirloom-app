import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addContact,
  fetchReminders,
  resendVerification,
  saveHeirProfile,
  saveReminder,
  verifyEmailCode,
} from "@/services/api/reminders";
import { ApiError } from "@/lib/api";
import { channelOf, normalizeDestination, pendingFrom, roleOf } from "@/lib/reminders";
import {
  cleanProfile,
  type FetchReminderResponse,
  type PendingVerification,
  type RemindersSubmit,
  type VerificationStatus,
  type VerifyEmailResponse,
} from "@/types/reminders";
import { REMINDER_POLL_MS } from "@/lib/constants";

const remindersKey = (estateAddress: string) => ["reminders", estateAddress];

// ─── Queries ──────────────────────────────────────────────────────

/**
 * `poll` while a verification is on screen: Telegram and email verify out of band and nothing is
 * pushed, so we look. Always re-fetches on focus, since people come back from Telegram or mail.
 */
export function useReminders(estateAddress: string, { poll = false }: { poll?: boolean } = {}) {
  return useQuery<FetchReminderResponse>({
    queryKey: remindersKey(estateAddress),
    queryFn: () => fetchReminders(estateAddress),
    enabled: !!estateAddress,
    retry: false,
    refetchOnWindowFocus: "always",
    refetchInterval: poll ? REMINDER_POLL_MS : false,
  });
}

// ─── Mutations ────────────────────────────────────────────────────

/**
 * Saves the whole reminders form at once. Without a subscription, one POST turns reminders on with
 * every contact and the heir profile; with one, each contact goes through add/contact (the backend
 * has no batch add) and the profile through PUT. Resolves with the verifications to show, the
 * owner's first.
 */
export function useSaveReminders(estateAddress: string) {
  const queryClient = useQueryClient();
  return useMutation<PendingVerification[], Error, RemindersSubmit>({
    mutationFn: async ({ hasSubscription, contacts, heir }) => {
      const recipients = contacts.map((c) => ({
        ...c,
        destination: normalizeDestination(c.channel, c.destination),
      }));
      const profile = heir === undefined ? undefined : cleanProfile(heir);

      const viaAdd = async () => {
        const out: PendingVerification[] = [];
        for (const recipient of recipients) {
          const res = await addContact(estateAddress, recipient);
          out.push(
            pendingFrom(res.verifications[0], { recipientId: res.recipientId, ...recipient }),
          );
        }
        if (profile !== undefined) await saveHeirProfile(estateAddress, profile);
        return out;
      };

      let out: PendingVerification[];
      if (hasSubscription) {
        out = await viaAdd();
      } else {
        try {
          const res = await saveReminder(estateAddress, "heirloom", recipients, profile);
          // Verifications carry the recipient id but not its role or contact: read them back.
          const saved = await fetchReminders(estateAddress);
          queryClient.setQueryData(remindersKey(estateAddress), saved);
          out = saved.recipients.map((r) =>
            pendingFrom(
              res.verifications.find((v) => v.reminderRecipientId === r.reminderRecipientId),
              {
                recipientId: r.reminderRecipientId,
                role: roleOf(r.role),
                channel: channelOf(r.channel),
                destination: r.destination,
              },
            ),
          );
        } catch (err) {
          // The estate already has a subscription we didn't see: add to it instead.
          if (err instanceof ApiError && err.code === "CONFLICT") out = await viaAdd();
          else throw err;
        }
      }
      // Heir emails get nothing to verify: the backend trusts them once the owner's contact is.
      return out
        .filter((p) => !(p.role === "heir" && p.channel === "email"))
        .sort((a, b) => Number(a.role === "heir") - Number(b.role === "heir"));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: remindersKey(estateAddress) }),
  });
}

export function useVerifyEmail(estateAddress: string) {
  const queryClient = useQueryClient();
  return useMutation<VerifyEmailResponse, Error, { code: string }>({
    mutationFn: ({ code }) => verifyEmailCode(estateAddress, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: remindersKey(estateAddress) });
    },
  });
}

export function useResendVerification(estateAddress: string) {
  const queryClient = useQueryClient();
  return useMutation<VerificationStatus, Error, { recipientId: string }>({
    mutationFn: ({ recipientId }) => resendVerification(estateAddress, recipientId),
    // Settled, not success: a 409 means it's already verified, and the list should show that.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: remindersKey(estateAddress) });
    },
  });
}
