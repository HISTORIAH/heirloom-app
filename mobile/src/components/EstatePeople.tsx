import { Text, View } from "react-native";

import { colors, font, space } from "@/theme";
import { shortAddress } from "@/lib";

interface EstatePeopleProps {
  heir: string;
  heartbeat?: string;
  guardian?: string;
}

function PersonRow({ title, address }: { title: string; address?: string }) {
  const named = address !== undefined;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 46,
        paddingVertical: 11,
        borderBottomWidth: space.rule,
        borderBottomColor: colors.line,
      }}
    >
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
    </View>
  );
}

export function EstatePeople({ heir, heartbeat, guardian }: EstatePeopleProps) {
  return (
    <View style={{ borderTopWidth: space.rule, borderTopColor: colors.line }}>
      <PersonRow title="Heir" address={heir} />
      <PersonRow title="Check-in signer" address={heartbeat} />
      <PersonRow title="Guardian" address={guardian} />
    </View>
  );
}
