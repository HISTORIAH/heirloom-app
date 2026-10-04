import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { PrimaryButton } from "@/components/ui";
import { colors, font, space } from "@/theme";
import { shortAddress } from "@/lib";

type EstatePeopleProps = {
  heir: string;
  heartbeat?: string;
  guardian?: string;
  /** Inline "Add" on an unset check-in signer or guardian. */
  onAddHeartbeat?: () => void;
  onAddGuardian?: () => void;
  /** Last row: "On", "Off" or "Sign in", opening the estate's reminders. */
  reminders?: { label: string; onPress: () => void };
};

const rowStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  minHeight: 46,
  paddingVertical: 11,
  borderBottomWidth: space.rule,
  borderBottomColor: colors.line,
} as const;

function PersonRow({
  title,
  address,
  onAdd,
}: {
  title: string;
  address?: string;
  onAdd?: () => void;
}) {
  const named = address !== undefined;
  return (
    <View style={rowStyle}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.regular, fontSize: 15, color: colors.ink }}>{title}</Text>
      </View>
      <Text
        style={{
          fontFamily: named ? font.bold : font.medium,
          fontSize: 15,
          fontVariant: ["tabular-nums"],
          color: named ? colors.ink : colors.mute,
        }}
      >
        {named ? shortAddress(address) : "Not set"}
      </Text>
      {!named && onAdd !== undefined ? (
        <PrimaryButton compact tone="paper" label="Add" onPress={onAdd} />
      ) : null}
    </View>
  );
}

function RemindersRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Reminders: ${label}`}
      accessibilityHint="Opens this estate's reminders"
      style={({ pressed }) => ({ ...rowStyle, opacity: pressed ? 0.72 : 1 })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.regular, fontSize: 15, color: colors.ink }}>Reminders</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="lock" size={16} color={colors.mute} />
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: colors.mute }}>{label}</Text>
        <Icon name="chevronRight" size={18} color={colors.mute} />
      </View>
    </Pressable>
  );
}

export function EstatePeople({
  heir,
  heartbeat,
  guardian,
  onAddHeartbeat,
  onAddGuardian,
  reminders,
}: EstatePeopleProps) {
  return (
    <View style={{ borderTopWidth: space.rule, borderTopColor: colors.line }}>
      <PersonRow title="Heir" address={heir} />
      <PersonRow title="Check-in signer" address={heartbeat} onAdd={onAddHeartbeat} />
      <PersonRow title="Guardian" address={guardian} onAdd={onAddGuardian} />
      {reminders !== undefined ? <RemindersRow {...reminders} /> : null}
    </View>
  );
}
