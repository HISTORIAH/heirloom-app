import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { ContactSheet } from "@/components/reminders/ContactSheet";
import { ReminderTimeline } from "@/components/reminders/ReminderTimeline";
import { VerifySheet } from "@/components/reminders/VerifySheet";
import { ActionRow, Badge, Cap, CheckBox, IconButton, Lede, PrimaryButton } from "@/components/ui";
import { BACKEND_URL } from "@/config";
import {
  useAddReminderContact,
  useEstates,
  useReminders,
  useResendVerification,
  useSession,
} from "@/hooks";
import { estateName, shortAddress } from "@/lib";
import { contactState, reminderError } from "@/lib/reminders";
import { colors, font, space } from "@/theme";
import type { ContactState, PendingVerification, ReminderRole } from "@/types/reminders";

function Small({ children, warn }: { children: string; warn?: boolean }) {
  return (
    <Text
      style={{
        fontFamily: warn ? font.semibold : font.regular,
        fontSize: 13,
        lineHeight: 18,
        color: warn ? colors.claim : colors.mute,
      }}
    >
      {children}
    </Text>
  );
}

function statusLine(contact: ContactState): string {
  if (contact.kind === "none") return "Not set";
  return contact.kind === "connected" ? "Connected" : "Waiting for Telegram";
}

/** The disabled "copy to every estate" switch. Owner contacts only; heir contacts never copy. */
function AllEstatesToggle() {
  return (
    <View
      accessibilityRole="checkbox"
      accessibilityState={{ checked: false, disabled: true }}
      accessibilityLabel="Use my contacts on all estates. Coming soon."
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: space.rule,
        borderColor: colors.ink,
        borderRadius: space.radiusBtn,
        backgroundColor: colors.paper,
        opacity: 0.45,
      }}
    >
      <CheckBox checked={false} />
      <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 14, color: colors.ink }}>
        Use my contacts on all estates
      </Text>
      <Badge label="Soon" />
    </View>
  );
}

/** One estate's Telegram reminders: who gets them, connecting each contact, and when they go out. */
export default function RemindersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { estate = "" } = useLocalSearchParams<{ estate: string }>();
  const { rows } = useEstates("authority");
  const [adding, setAdding] = useState<ReminderRole | undefined>(undefined);
  const [pending, setPending] = useState<PendingVerification | undefined>(undefined);
  const reminders = useReminders(estate, { poll: pending !== undefined });
  const session = useSession();
  const add = useAddReminderContact(estate);
  const resend = useResendVerification(estate);

  const row = rows.find((item) => String(item.address) === estate);
  const hasOthers = rows.some((item) => String(item.address) !== estate);
  const name = row !== undefined ? estateName(row) : shortAddress(estate);
  const heirLabel = row !== undefined ? `Heir ${shortAddress(String(row.data.heir))}` : "Your heir";

  const self = contactState(reminders.recipients, "check_in_signer");
  const heir = contactState(reminders.recipients, "heir");
  const verified =
    pending !== undefined &&
    reminders.recipients.some((r) => r.reminderRecipientId === pending.recipientId && r.verified);

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace(`/estate/${estate}`);
  }

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
      return <PrimaryButton compact tone="paper" label="Add" onPress={() => setAdding(role)} />;
    }
    if (contact.kind === "waiting") {
      return (
        <PrimaryButton
          compact
          tone="paper"
          icon={role === "heir" ? "send" : undefined}
          label={resend.isPending ? "…" : role === "heir" ? "Invite" : "Verify"}
          disabled={resend.isPending}
          onPress={() => verify(contact, role)}
        />
      );
    }
    return <Badge label="Connected" fill={colors.lime} />;
  }

  function contactRow(contact: ContactState, role: ReminderRole) {
    return (
      <View style={{ borderTopWidth: space.rule, borderTopColor: colors.line }}>
        <ActionRow
          first
          icon="telegram"
          title={contact.kind === "none" ? "Telegram" : `@${contact.recipient.destination}`}
          sub={statusLine(contact)}
          action={action(contact, role)}
        />
      </View>
    );
  }

  let body;
  if (BACKEND_URL === undefined) {
    body = <Lede>Reminders aren’t available in this build.</Lede>;
  } else if (reminders.status === "locked") {
    body = (
      <View style={{ gap: 14 }}>
        <Cap>Private to you</Cap>
        <Lede>Sign a message to see and change this estate’s reminders. No fee.</Lede>
        <PrimaryButton
          icon="unlock"
          label={session.signing ? "Check your wallet…" : "Sign in"}
          disabled={session.signing}
          onPress={() => void session.signIn().catch(() => undefined)}
        />
      </View>
    );
  } else if (reminders.status === "error") {
    body = (
      <View style={{ gap: 12 }}>
        <Small warn>{reminders.error ?? "Couldn't load reminders."}</Small>
        <PrimaryButton tone="paper" label="Try again" onPress={() => void reminders.refetch()} />
      </View>
    );
  } else if (reminders.status === "loading") {
    body = <Small>Loading…</Small>;
  } else {
    body = (
      <View style={{ gap: 32 }}>
        <View style={{ gap: 14 }}>
          <Cap>Remind you</Cap>
          {contactRow(self, "check_in_signer")}
        </View>

        <View style={{ gap: 14 }}>
          <Cap>Tell your heir</Cap>
          {contactRow(heir, "heir")}
          <Small>They hear nothing until the grace period ends.</Small>
        </View>

        {resend.isError ? <Small warn>{reminderError(resend.error)}</Small> : null}

        <View style={{ gap: 14 }}>
          <Cap>When reminders go out</Cap>
          <ReminderTimeline />
        </View>

        {hasOthers ? <AllEstatesToggle /> : null}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 12) + 8,
          paddingHorizontal: space.pad,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <IconButton icon="chevronLeft" label="Back" onPress={back} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 18, color: colors.ink }}>Reminders</Text>
          <Text
            numberOfLines={1}
            style={{ fontFamily: font.regular, fontSize: 13, color: colors.mute }}
          >
            {name}
          </Text>
        </View>
        {reminders.status === "ready" ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: space.rule,
              borderColor: colors.ink,
              backgroundColor: colors.lime,
            }}
          >
            <Icon name="unlock" size={14} weight={2.4} />
            <Text style={{ fontFamily: font.bold, fontSize: 12, color: colors.ink }}>
              Signed in
            </Text>
          </View>
        ) : null}
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.pad,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 16) + 40,
        }}
      >
        {body}
      </ScrollView>

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
          estateName={name}
          heirLabel={heirLabel}
          resending={resend.isPending}
          error={resend.isError ? reminderError(resend.error) : undefined}
          onResend={() =>
            resend.mutate(
              {
                recipientId: pending.recipientId,
                role: pending.role,
                destination: pending.destination,
              },
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
