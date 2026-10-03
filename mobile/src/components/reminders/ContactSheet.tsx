import { useState } from "react";
import { Text, View } from "react-native";

import { ModalSheet } from "@/components/ModalSheet";
import { Cap, Display, Lede, PrimaryButton, TextField } from "@/components/ui";
import { SOON_REMINDER_CHANNELS, TELEGRAM_USERNAME_PATTERN } from "@/constants/alerts";
import { telegramHandle } from "@/lib/reminders";
import { colors, font, space } from "@/theme";
import type { ReminderRole } from "@/types/reminders";

function ChannelChip({ label, on, soon }: { label: string; on?: boolean; soon?: boolean }) {
  return (
    <View
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
        <Text style={{ fontFamily: font.bold, fontSize: 10, letterSpacing: 1, color: colors.quiet }}>
          SOON
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Add one Telegram contact for a role. Contacts can't be edited or removed yet, so saving goes
 * through a confirm step that repeats the username back.
 */
export function ContactSheet({
  role,
  heirLabel,
  saving,
  error,
  onCancel,
  onSave,
}: {
  role: ReminderRole;
  heirLabel: string;
  saving?: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (username: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [confirming, setConfirming] = useState(false);
  const self = role === "check_in_signer";
  const valid = TELEGRAM_USERNAME_PATTERN.test(username.trim());
  const handle = `@${telegramHandle(username)}`;

  if (confirming) {
    return (
      <ModalSheet onClose={onCancel}>
        <Cap>{self ? "Remind me" : "Tell my heir"}</Cap>
        <Display size={24}>{`Reminders go to ${handle}`}</Display>
        <Lede size={15}>
          {self
            ? "You can't change or remove this contact yet, so check the spelling."
            : `${heirLabel} has to open the link from ${handle}'s Telegram. You can't change this contact yet, so check the spelling.`}
        </Lede>
        {error !== undefined ? (
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.claim }}>{error}</Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Back" tone="paper" disabled={saving} onPress={() => setConfirming(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={saving ? "Saving…" : "Save"}
              tone="ink"
              disabled={saving}
              onPress={() => onSave(username)}
            />
          </View>
        </View>
      </ModalSheet>
    );
  }

  return (
    <ModalSheet onClose={onCancel}>
      <Cap>{self ? "Remind me" : "Tell my heir"}</Cap>
      <Display size={24}>
        {self ? "Where should we remind you?" : `Where should we tell ${heirLabel}?`}
      </Display>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <ChannelChip label="Telegram" on />
        {SOON_REMINDER_CHANNELS.map((item) => (
          <ChannelChip key={item.channel} label={item.label} soon />
        ))}
      </View>
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
      <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.mute }}>
        {self
          ? "Needs a Telegram @username. You'll tap Start in Telegram to connect it."
          : `They'll need a Telegram @username, and to tap Start on a link you send them.`}
      </Text>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Not now" tone="paper" onPress={onCancel} />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label="Continue"
            tone="ink"
            disabled={!valid}
            onPress={() => setConfirming(true)}
          />
        </View>
      </View>
    </ModalSheet>
  );
}
