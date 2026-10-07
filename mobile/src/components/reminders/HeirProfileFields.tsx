import { Text, View } from "react-native";

import { TextField } from "@/components/ui";
import { HEIR_NAME_MAX, HEIR_NOTE_MAX } from "@/constants/alerts";
import { colors, font } from "@/theme";
import type { HeirProfile } from "@/types/reminders";

/**
 * The three fields that personalise the heir alert. `requireOwnerName` marks it at setup, where
 * it's required: a name the heir knows is what keeps the alert from reading as phishing.
 */
export function HeirProfileFields({
  value,
  onChange,
  requireOwnerName,
  disabled,
}: {
  value: HeirProfile;
  onChange: (next: HeirProfile) => void;
  requireOwnerName?: boolean;
  disabled?: boolean;
}) {
  const note = value.note ?? "";
  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <TextField
          label="What does your heir call you?"
          hint={requireOwnerName ? "required" : undefined}
          value={value.ownerName ?? ""}
          onChangeText={(ownerName) => onChange({ ...value, ownerName })}
          placeholder="e.g. Dad"
          maxLength={HEIR_NAME_MAX}
          autoCapitalize="words"
          editable={!disabled}
        />
        <Text
          style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.mute }}
        >
          It's in the alert, so it doesn't look like phishing.
        </Text>
      </View>
      <TextField
        label="Your heir's name"
        hint="optional"
        value={value.heirName ?? ""}
        onChangeText={(heirName) => onChange({ ...value, heirName })}
        placeholder="e.g. Sarah"
        maxLength={HEIR_NAME_MAX}
        autoCapitalize="words"
        editable={!disabled}
      />
      <View style={{ gap: 6 }}>
        <TextField
          label="A note for them"
          hint="optional"
          value={note}
          onChangeText={(text) => onChange({ ...value, note: text })}
          placeholder="Anything you want them to know…"
          maxLength={HEIR_NOTE_MAX}
          multiline
          editable={!disabled}
        />
        <Text
          style={{
            alignSelf: "flex-end",
            fontFamily: font.regular,
            fontSize: 12,
            fontVariant: ["tabular-nums"],
            color: colors.mute,
          }}
        >
          {`${note.length}/${HEIR_NOTE_MAX}`}
        </Text>
      </View>
    </View>
  );
}
