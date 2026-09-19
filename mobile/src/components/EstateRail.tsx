import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui";
import { colors } from "@/theme";

interface EstateRailProps {
  count: number;
  onScan?: () => void;
}

export function EstateRail({ count, onScan }: EstateRailProps) {
  const n = String(count).padStart(2, "0");
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 48,
        paddingHorizontal: 20,
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
      <View style={{ flex: 1 }} />
      <PrimaryButton label="Scan" compact tone="sage" onPress={onScan} />
    </View>
  );
}
