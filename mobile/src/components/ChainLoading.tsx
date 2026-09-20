import { Text, View } from "react-native";

import { Cap, Tile } from "@/components/ui";
import { VaultMark } from "@/components/VaultMark";
import { colors } from "@/theme";

export function ChainLoading({
  cap = "On chain",
  body,
  compact,
}: {
  cap?: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <View
      style={{
        flex: compact ? undefined : 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: compact ? 0 : 20,
        paddingVertical: compact ? 8 : 24,
        marginTop: compact ? 24 : 0,
      }}
    >
      <Tile paper style={{ width: "100%", alignItems: "center", paddingVertical: 36 }}>
        <View style={{ opacity: 0.35, marginBottom: 18 }}>
          <VaultMark size={64} color={colors.line} />
        </View>
        <Cap>{cap}</Cap>
        <Text
          style={{
            marginTop: 10,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 16,
            lineHeight: 24,
            color: colors.mute,
            textAlign: "center",
          }}
        >
          {body}
        </Text>
      </Tile>
    </View>
  );
}
