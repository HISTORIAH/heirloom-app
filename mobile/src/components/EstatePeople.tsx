import { Text, View } from "react-native";

import { shortAddress } from "@/lib/address";
import { colors } from "@/theme";

interface EstatePeopleProps {
  heir: string;
  heartbeat?: string;
  guardian?: string;
}

function PersonRow({
  title,
  address,
}: {
  title: string;
  address?: string;
}) {
  const named = address !== undefined;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 16,
            color: colors.ink,
          }}
        >
          {title}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: named ? "SpaceGrotesk_600SemiBold" : "SpaceGrotesk_500Medium",
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
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
      <PersonRow title="Heir" address={heir} />
      <PersonRow title="Check-in signer" address={heartbeat} />
      <PersonRow title="Guardian" address={guardian} />
    </View>
  );
}
