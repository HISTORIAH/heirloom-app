import { useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { ModalSheet } from "@/components/ModalSheet";
import { HeirProfileFields } from "@/components/reminders/HeirProfileFields";
import { Cap, Display, Lede, PrimaryButton, TextField } from "@/components/ui";
import {
  EMAIL_PATTERN,
  REMINDER_CHANNELS,
  SOON_REMINDER_CHANNELS,
  TELEGRAM_USERNAME_PATTERN,
} from "@/constants/alerts";
import { telegramHandle } from "@/lib/reminders";
import { colors, font, space } from "@/theme";
import type { HeirProfile, NewContact, ReminderChannel, ReminderRole } from "@/types/reminders";

function ChannelChip({
  label,
  on,
  soon,
  onPress,
}: {
  label: string;
  on?: boolean;
  soon?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={soon || onPress === undefined}
      accessibilityRole="radio"
      accessibilityState={{ selected: on, disabled: soon }}
      accessibilityLabel={soon ? `${label}, coming soon` : label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 36,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: space.rule,
        borderStyle: soon ? "dashed" : "solid",
        borderColor: soon ? colors.quiet : colors.ink,
        backgroundColor: on ? colors.ink : "transparent",
      }}
    >
      <Text
        style={{
          fontFamily: font.bold,
          fontSize: 13,
          color: on ? colors.bg : soon ? colors.quiet : colors.ink,
        }}
      >
        {label}
      </Text>
      {soon ? (
        <Text
          style={{ fontFamily: font.bold, fontSize: 10, letterSpacing: 1, color: colors.quiet }}
        >
          SOON
        </Text>
      ) : null}
    </Pressable>
  );
}

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

function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function hint(channel: ReminderChannel, self: boolean): string {
  if (channel === "email") {
    return self
      ? "We'll email you a code to confirm it's yours."
      : "We don't email your heir a code, so type it twice. One typo and the alert goes nowhere.";
  }
  return self
    ? "Needs a Telegram @username. You'll tap Start in Telegram to connect it."
    : "They'll need a Telegram @username, and to tap Start on a link you send them.";
}

function confirmLine(
  channel: ReminderChannel,
  self: boolean,
  heirLabel: string,
  to: string,
): string {
  if (channel === "email") {
    return self
      ? "We'll send a code there. You can't change or remove this contact yet, so check the spelling."
      : `${heirLabel} won't get a code, so this is the address the alert goes to. It starts once your own contact is verified. You can't change it yet, so check the spelling.`;
  }
  return self
    ? "You can't change or remove this contact yet, so check the spelling."
    : `${heirLabel} has to open the link from ${to}'s Telegram. You can't change this contact yet, so check the spelling.`;
}

/**
 * Add one contact for a role. The first contact turns reminders on, so `askProfile` adds a step
 * for the heir profile; the owner's name is required there. Contacts can't be edited or removed
 * yet, so saving goes through a confirm step that repeats the contact back.
 */
export function ContactSheet({
  role,
  heirLabel,
  channels,
  askProfile,
  saving,
  error,
  onCancel,
  onSave,
}: {
  role: ReminderRole;
  heirLabel: string;
  /** Channels this role has no contact on yet. */
  channels: ReminderChannel[];
  askProfile: boolean;
  saving?: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (contact: NewContact) => void;
}) {
  const { height } = useWindowDimensions();
  const [step, setStep] = useState<"contact" | "profile" | "confirm">("contact");
  const [channel, setChannel] = useState<ReminderChannel>(channels[0] ?? "telegram");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailAgain, setEmailAgain] = useState("");
  const [profile, setProfile] = useState<HeirProfile>({ heirName: "", ownerName: "", note: "" });
  const self = role === "checkInSigner";
  const cap = self ? "Remind me" : "Tell my heir";

  const emailValid = EMAIL_PATTERN.test(email.trim());
  // Only the heir's email is typed twice: the owner's is checked by the code we send.
  const emailMatches = self || sameEmail(email, emailAgain);
  const valid =
    channel === "telegram"
      ? TELEGRAM_USERNAME_PATTERN.test(username.trim())
      : emailValid && emailMatches;
  const to = channel === "telegram" ? `@${telegramHandle(username)}` : email.trim();
  const profileValid = (profile.ownerName ?? "").trim().length > 0;

  function save() {
    onSave({
      role,
      channel,
      destination: channel === "telegram" ? username : email,
      heir: askProfile ? profile : undefined,
    });
  }

  if (step === "confirm") {
    return (
      <ModalSheet onClose={onCancel}>
        <Cap>{cap}</Cap>
        <Display size={24}>{`Reminders go to ${to}`}</Display>
        <Lede size={15}>{confirmLine(channel, self, heirLabel, to)}</Lede>
        {askProfile && profile.ownerName?.trim() ? (
          <Small>{`The heir alert will say it's from “${profile.ownerName.trim()}”.`}</Small>
        ) : null}
        {error !== undefined ? <Small warn>{error}</Small> : null}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label="Back"
              tone="paper"
              disabled={saving}
              onPress={() => setStep(askProfile ? "profile" : "contact")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={saving ? "Saving…" : "Save"}
              tone="ink"
              disabled={saving}
              onPress={save}
            />
          </View>
        </View>
      </ModalSheet>
    );
  }

  if (step === "profile") {
    return (
      <ModalSheet onClose={onCancel}>
        <Cap>Heir alert</Cap>
        <Display size={24}>How should the alert read?</Display>
        <ScrollView style={{ maxHeight: height * 0.5 }} keyboardShouldPersistTaps="handled">
          <HeirProfileFields value={profile} onChange={setProfile} requireOwnerName />
        </ScrollView>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Back" tone="paper" onPress={() => setStep("contact")} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label="Continue"
              tone="ink"
              disabled={!profileValid}
              onPress={() => setStep("confirm")}
            />
          </View>
        </View>
      </ModalSheet>
    );
  }

  return (
    <ModalSheet onClose={onCancel}>
      <Cap>{cap}</Cap>
      <Display size={24}>
        {self ? "Where should we remind you?" : `Where should we tell ${heirLabel}?`}
      </Display>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {REMINDER_CHANNELS.filter((item) => channels.includes(item.channel)).map((item) => (
          <ChannelChip
            key={item.channel}
            label={item.label}
            on={channel === item.channel}
            onPress={() => setChannel(item.channel)}
          />
        ))}
        {SOON_REMINDER_CHANNELS.map((item) => (
          <ChannelChip key={item.channel} label={item.label} soon />
        ))}
      </View>
      {channel === "telegram" ? (
        <TextField
          label="Telegram username"
          hint={self ? "yours" : "theirs"}
          value={username}
          onChangeText={setUsername}
          placeholder="@username"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          error={username.length > 0 && !valid}
        />
      ) : (
        <>
          <TextField
            label="Email"
            hint={self ? "yours" : "theirs"}
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={self ? "email" : "off"}
            error={email.length > 0 && !emailValid}
          />
          {!self ? (
            <TextField
              label="Email again"
              value={emailAgain}
              onChangeText={setEmailAgain}
              placeholder="Type it again to confirm"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              // No pasting the first field into the second: the point is to type it twice.
              contextMenuHidden
              error={emailAgain.length > 0 && !emailMatches}
            />
          ) : null}
          {!self && emailAgain.length > 0 && !emailMatches ? (
            <Small warn>The emails don't match.</Small>
          ) : null}
        </>
      )}
      <Small>{hint(channel, self)}</Small>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Not now" tone="paper" onPress={onCancel} />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label="Continue"
            tone="ink"
            disabled={!valid}
            onPress={() => setStep(askProfile ? "profile" : "confirm")}
          />
        </View>
      </View>
    </ModalSheet>
  );
}
