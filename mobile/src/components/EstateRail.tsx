import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui";
import { colors } from "@/theme";

interface EstateRailProps {
  count: number;
  onNewEstate?: () => void;
}

export function EstateRail({ count, onNewEstate }: EstateRailProps) {
  const n = String(count).padStart(2, "0");
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 48,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}
    >
      <Text
        style={{
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 11,
          letterSpacing: 1.98,
          textTransform: "uppercase",
          color: colors.ink,
        }}
      >
        Your estates
      </Text>
      <Text
        style={{
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 11,
          letterSpacing: 1.98,
          color: colors.ink,
        }}
      >
        {n}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      <PrimaryButton label="New Estate" compact onPress={onNewEstate} />
    </View>
  );
}
