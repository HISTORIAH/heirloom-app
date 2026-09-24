import { Text, View } from "react-native";

import { colors } from "@/theme";

export function ChainLoading({
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
        justifyContent: "center",
        paddingHorizontal: 20,
        paddingVertical: compact ? 28 : 24,
      }}
    >
      <Text
        style={{
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 16,
          lineHeight: 24,
          color: colors.mute,
        }}
      >
        {body}
      </Text>
    </View>
  );
}
