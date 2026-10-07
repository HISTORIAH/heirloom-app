import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { ContactSheet } from "@/components/reminders/ContactSheet";
import { HeirProfileCard } from "@/components/reminders/HeirProfileCard";
import { ReminderTimeline } from "@/components/reminders/ReminderTimeline";
import { VerifySheet } from "@/components/reminders/VerifySheet";
import { ActionRow, Badge, Cap, CheckBox, IconButton, Lede, PrimaryButton } from "@/components/ui";
import { BACKEND_URL } from "@/config";
import {
  useAddReminderContact,
  useEstates,
  useReminders,
  useResendVerification,
  useSaveHeirProfile,
  useSession,
  useVerifyEmail,
} from "@/hooks";
import { estateName, shortAddress } from "@/lib";
import {
  channelLabel,
  contactState,
  freeChannels,
  reminderError,
  sameEnum,
  verifyError,
} from "@/lib/reminders";
import { colors, font, space } from "@/theme";
import type {
  ContactState,
  NewContact,
  PendingVerification,
  RecipientResponse,
  ReminderChannel,
  ReminderRole,
} from "@/types/reminders";

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

function channelOf(recipient: RecipientResponse): ReminderChannel {
  return sameEnum(recipient.channel, "email") ? "email" : "telegram";
}

/** Heir emails get no code: the backend trusts them once the owner's own contact is verified. */
function statusLine(contact: ContactState, role: ReminderRole): string {
  if (contact.kind === "none") return "Not set";
  if (contact.kind === "connected") return "Connected";
  if (channelOf(contact.recipient) === "telegram") return "Waiting for Telegram";
  return role === "heir"
    ? "Starts once your contact is verified"
    : "Not verified · check your inbox";
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

/**
 * One estate's reminders: who gets them, connecting each contact, how the heir alert reads, and
 * when they go out.
 */
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
  const verifyEmail = useVerifyEmail(estate);
  const saveProfile = useSaveHeirProfile(estate);

  const row = rows.find((item) => String(item.address) === estate);
  const hasOthers = rows.some((item) => String(item.address) !== estate);
  const name = row !== undefined ? estateName(row) : shortAddress(estate);
  const heirName = reminders.heir?.heirName?.trim();
  const heirLabel = heirName
    ? heirName
    : row !== undefined
      ? `Heir ${shortAddress(String(row.data.heir))}`
      : "Your heir";
  const hasSubscription = reminders.recipients.length > 0;

  const verified =
    pending !== undefined &&
    reminders.recipients.some((r) => r.reminderRecipientId === pending.recipientId && r.verified);

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace(`/estate/${estate}`);
  }

  function onSave(contact: NewContact) {
    add.mutate(
      { ...contact, hasSubscription },
      {
        onSuccess: (next) => {
          setAdding(undefined);
          add.reset();
          // Heir emails aren't sent anything to verify. Otherwise, with no verification back
          // (transient backend error), the sheet opens on resend.
          if (contact.role === "heir" && contact.channel === "email") return;
          if (next !== undefined) setPending(next);
        },
      },
    );
  }

  function verify(contact: ContactState, role: ReminderRole) {
    if (contact.kind !== "waiting") return;
    const target = {
      recipientId: contact.recipient.reminderRecipientId,
      role,
      channel: channelOf(contact.recipient),
      destination: contact.recipient.destination,
    };
    // The email code is already in the inbox; open the sheet to type it, resend from there.
    if (target.channel === "email") {
      setPending({ ...target, sent: true });
      return;
    }
    resend.mutate(target, { onSuccess: (next) => next !== undefined && setPending(next) });
  }

  function action(contact: ContactState, role: ReminderRole) {
    if (contact.kind === "connected") return <Badge label="Connected" fill={colors.lime} />;
    if (contact.kind === "none") return null;
    const email = channelOf(contact.recipient) === "email";
    if (email && role === "heir") return <Badge label="Pending" />;
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

  /** One row per contact the role has, then an Add row while a channel is still free. */
  function contactRows(role: ReminderRole) {
    const contacts = reminders.recipients
      .filter((r) => sameEnum(r.role, role))
      .map((r) => contactState([r], role));
    const free = freeChannels(reminders.recipients, role);
    return (
      <View style={{ borderTopWidth: space.rule, borderTopColor: colors.line }}>
        {contacts.map((contact, i) =>
          contact.kind === "none" ? null : (
            <ActionRow
              key={contact.recipient.reminderRecipientId}
              first={i === 0}
              icon={channelOf(contact.recipient) === "email" ? "mail" : "telegram"}
              title={
                channelOf(contact.recipient) === "email"
                  ? contact.recipient.destination
                  : `@${contact.recipient.destination}`
              }
              sub={statusLine(contact, role)}
              action={action(contact, role)}
            />
          ),
        )}
        {free.length > 0 ? (
          <ActionRow
            first={contacts.length === 0}
            icon={contacts.length === 0 ? "bell" : "plus"}
            title={contacts.length === 0 ? "Not set" : `Add ${channelLabel(free[0] ?? "")}`}
            sub={contacts.length === 0 ? "Telegram or email" : "As well"}
            action={
              <PrimaryButton compact tone="paper" label="Add" onPress={() => setAdding(role)} />
            }
          />
        ) : null}
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
          {contactRows("checkInSigner")}
        </View>

        <View style={{ gap: 14 }}>
          <Cap>Tell your heir</Cap>
          {contactRows("heir")}
          <Small>They hear nothing until the grace period ends.</Small>
        </View>

        {hasSubscription ? (
          <View style={{ gap: 14 }}>
            <Cap>Heir alert</Cap>
            <HeirProfileCard
              key={JSON.stringify(reminders.heir)}
              saved={reminders.heir}
              saving={saveProfile.isPending}
              justSaved={saveProfile.isSuccess}
              error={saveProfile.isError ? reminderError(saveProfile.error) : undefined}
              onSave={(profile) => saveProfile.mutate(profile)}
            />
          </View>
        ) : null}

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
          channels={freeChannels(reminders.recipients, adding)}
          askProfile={!hasSubscription}
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
          verifying={verifyEmail.isPending}
          error={
            resend.isError
              ? reminderError(resend.error)
              : verifyEmail.isError
                ? verifyError(verifyEmail.error)
                : undefined
          }
          onResend={() => {
            verifyEmail.reset();
            resend.mutate(pending, { onSuccess: (next) => setPending(next ?? pending) });
          }}
          onVerify={(code) => {
            resend.reset();
            verifyEmail.mutate(code);
          }}
          onClose={() => {
            setPending(undefined);
            resend.reset();
            verifyEmail.reset();
          }}
        />
      ) : null}
    </View>
  );
}
