import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

import { ChannelTabs } from "@/components/reminders/ChannelTabs";
import { TextField } from "@/components/ui";
import { draftBlank, draftProblem } from "@/lib/reminders";
import { colors, font } from "@/theme";
import type { ContactDraft, ReminderChannel, ReminderRole } from "@/types/reminders";

function hint(channel: ReminderChannel, self: boolean): string {
  if (channel === "email") {
    return self
      ? "We'll email you a code to confirm it's yours."
      : "They don't get a code, so type it twice. One typo and the alert goes nowhere.";
  }
  return self
    ? "You'll tap Start in Telegram to connect it."
    : "They'll tap Start on a link you send them.";
}

/**
 * One role's new contact, typed in place: channel tabs, then the field (twice for the heir's
 * email). Problems show once a field is left, not while typing.
 */
export function ContactFields({
  role,
  channels,
  draft,
  onChange,
  disabled,
}: {
  role: ReminderRole;
  /** Channels this role has no contact on yet. */
  channels: ReminderChannel[];
  draft: ContactDraft;
  onChange: (next: ContactDraft) => void;
  disabled?: boolean;
}) {
  const self = role === "checkInSigner";
  const [touched, setTouched] = useState(false);
  const [touchedAgain, setTouchedAgain] = useState(false);
  const problem = draftBlank(draft) ? undefined : draftProblem(draft, role);
  const mismatch = problem?.field === "again";
  const show = problem !== undefined && (mismatch ? touchedAgain : touched);

  function pick(channel: ReminderChannel) {
    if (channel === draft.channel) return;
    setTouched(false);
    setTouchedAgain(false);
    onChange({ channel, value: "", again: "" });
  }

  return (
    <Animated.View layout={LinearTransition.duration(220)} style={{ gap: 12 }}>
      <ChannelTabs channels={channels} value={draft.channel} onChange={pick} disabled={disabled} />
      {draft.channel === "telegram" ? (
        <TextField
          key="telegram"
          value={draft.value}
          onChangeText={(value) => onChange({ ...draft, value })}
          onBlur={() => setTouched(true)}
          placeholder={self ? "@yourname" : "@theirname"}
          accessibilityLabel={self ? "Your Telegram username" : "Your heir's Telegram username"}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          editable={!disabled}
          error={show}
        />
      ) : (
        <View key="email" style={{ gap: 10 }}>
          <TextField
            value={draft.value}
            onChangeText={(value) => onChange({ ...draft, value })}
            onBlur={() => setTouched(true)}
            placeholder={self ? "you@example.com" : "them@example.com"}
            accessibilityLabel={self ? "Your email" : "Your heir's email"}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={self ? "email" : "off"}
            editable={!disabled}
            error={show && !mismatch}
          />
          {!self && !draftBlank(draft) ? (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
              <TextField
                value={draft.again}
                onChangeText={(again) => onChange({ ...draft, again })}
                onBlur={() => setTouchedAgain(true)}
                placeholder="Type it again"
                accessibilityLabel="Your heir's email, again"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                // No pasting the first field into the second: the point is to type it twice.
                contextMenuHidden
                editable={!disabled}
                error={show && mismatch}
              />
            </Animated.View>
          ) : null}
        </View>
      )}
      <Text
        style={{
          fontFamily: show ? font.semibold : font.regular,
          fontSize: 13,
          lineHeight: 18,
          color: show ? colors.claim : colors.mute,
        }}
      >
        {show && problem !== undefined ? problem.message : hint(draft.channel, self)}
      </Text>
    </Animated.View>
  );
}
