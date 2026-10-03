import { useState } from "react";
import { Text, View } from "react-native";

import { ContactSheet } from "@/components/reminders/ContactSheet";
import { VerifySheet } from "@/components/reminders/VerifySheet";
import { ActionRow, Cap, PrimaryButton } from "@/components/ui";
import { HEIR_ALERT_TIMING, REMINDER_SCHEDULE } from "@/constants/alerts";
import {
  useAddReminderContact,
  useReminders,
  useResendVerification,
  useSession,
} from "@/hooks";
import { contactState, reminderError } from "@/lib/reminders";
import { colors, font, space } from "@/theme";
import type { ContactState, PendingVerification, ReminderRole } from "@/types/reminders";

function statusLine(contact: ContactState): string {
  if (contact.kind === "none") return "Not set";
  const handle = `@${contact.recipient.destination}`;
  return contact.kind === "connected" ? `${handle} · connected` : `${handle} · waiting for Telegram`;
}

function Schedule() {
  return (
    <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.mute }}>
      {`You're reminded ${REMINDER_SCHEDULE.map((s) => s.toLowerCase()).join(", ")}. Your heir is told ${HEIR_ALERT_TIMING}. Checking in resets everything.`}
    </Text>
  );
}

/** Telegram reminders for one estate: who gets them, and connecting each contact. */
export function RemindersSection({
  estateAddress,
  estateName,
  heirLabel,
}: {
  estateAddress: string;
  estateName: string;
  heirLabel: string;
}) {
  const [adding, setAdding] = useState<ReminderRole | undefined>(undefined);
  const [pending, setPending] = useState<PendingVerification | undefined>(undefined);
  const reminders = useReminders(estateAddress, { poll: pending !== undefined });
  const session = useSession();
  const add = useAddReminderContact(estateAddress);
  const resend = useResendVerification(estateAddress);

  const self = contactState(reminders.recipients, "check_in_signer");
  const heir = contactState(reminders.recipients, "heir");
  const verified =
    pending !== undefined &&
    reminders.recipients.some((r) => r.reminderRecipientId === pending.recipientId && r.verified);

  function onSave(username: string) {
    if (adding === undefined) return;
    add.mutate(
      { role: adding, username, hasSubscription: reminders.recipients.length > 0 },
      {
        onSuccess: (next) => {
          setAdding(undefined);
          add.reset();
          // No verification back (transient backend error): the contact exists, so the row
          // shows "waiting" and Verify gets a fresh link.
          if (next !== undefined) setPending(next);
        },
      },
    );
  }

  function verify(contact: ContactState, role: ReminderRole) {
    if (contact.kind !== "waiting") return;
    resend.mutate(
      {
        recipientId: contact.recipient.reminderRecipientId,
        role,
        destination: contact.recipient.destination,
      },
      { onSuccess: (next) => next !== undefined && setPending(next) },
    );
  }

  function action(contact: ContactState, role: ReminderRole) {
    if (contact.kind === "none") {
      return (
        <PrimaryButton compact tone="paper" label="Add" onPress={() => setAdding(role)} />
      );
    }
    if (contact.kind === "waiting") {
      return (
        <PrimaryButton
          compact
          tone="paper"
          label={resend.isPending ? "…" : "Verify"}
          disabled={resend.isPending}
          onPress={() => verify(contact, role)}
        />
      );
    }
    return null;
  }

  return (
    <View style={{ gap: 12 }}>
      <Cap>Reminders</Cap>
      {reminders.status === "locked" ? (
        <View style={{ gap: 12 }}>
          <ActionRow
            first
            icon="lock"
            title="Private to you"
            sub="Sign a message to see and change reminders. No fee."
            action={
              <PrimaryButton
                compact
                tone="paper"
                label={session.signing ? "Signing…" : "Sign in"}
                disabled={session.signing}
                onPress={() => void session.signIn().catch(() => undefined)}
              />
            }
          />
        </View>
      ) : reminders.status === "error" ? (
        <ActionRow
          first
          icon="bell"
          title="Couldn't load reminders"
          sub={reminders.error}
          action={
            <PrimaryButton compact tone="paper" label="Retry" onPress={() => void reminders.refetch()} />
          }
        />
      ) : (
        <View style={{ borderTopWidth: space.rule, borderTopColor: colors.line }}>
          <ActionRow
            first
            icon="telegram"
            title="You · check-in reminders"
            sub={reminders.status === "loading" ? "Loading…" : statusLine(self)}
            action={reminders.status === "ready" ? action(self, "check_in_signer") : null}
          />
          <ActionRow
            icon="telegram"
            title={`${heirLabel} · if grace runs out`}
            sub={reminders.status === "loading" ? "Loading…" : statusLine(heir)}
            action={reminders.status === "ready" ? action(heir, "heir") : null}
          />
          {resend.isError ? (
            <Text style={{ paddingTop: 8, fontFamily: font.semibold, fontSize: 13, color: colors.claim }}>
              {reminderError(resend.error)}
            </Text>
          ) : null}
        </View>
      )}
      <Schedule />

      {adding !== undefined ? (
        <ContactSheet
          role={adding}
          heirLabel={heirLabel}
          saving={add.isPending}
          error={add.isError ? reminderError(add.error) : undefined}
          onCancel={() => {
            setAdding(undefined);
            add.reset();
          }}
          onSave={onSave}
        />
      ) : null}
      {pending !== undefined ? (
        <VerifySheet
          pending={pending}
          verified={verified}
          estateName={estateName}
          heirLabel={heirLabel}
          resending={resend.isPending}
          error={resend.isError ? reminderError(resend.error) : undefined}
          onResend={() =>
            resend.mutate(
              { recipientId: pending.recipientId, role: pending.role, destination: pending.destination },
              { onSuccess: (next) => setPending(next ?? pending) },
            )
          }
          onClose={() => {
            setPending(undefined);
            resend.reset();
          }}
        />
      ) : null}
    </View>
  );
}
