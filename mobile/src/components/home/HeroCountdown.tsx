import { Text, View } from "react-native";

import { colors, font } from "@/theme";

function countSize(value: number, compact?: boolean): number {
  if (value >= 1000) return compact ? 52 : 60;
  if (value >= 100) return compact ? 64 : 72;
  return compact ? 76 : 88;
}

export function HeroCountdown({
  value,
  caption,
  compact,
}: {
  value: number;
  caption: string;
  compact?: boolean;
}) {
  const size = countSize(value, compact);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
      <Text
        style={{
          fontFamily: font.semibold,
          fontSize: size,
          lineHeight: size,
          letterSpacing: size * -0.045,
          fontVariant: ["tabular-nums"],
          color: colors.ink,
          marginBottom: -6,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          flex: 1,
          paddingBottom: 6,
          fontFamily: font.bold,
          fontSize: compact ? 17 : 18,
          lineHeight: compact ? 21 : 22,
          color: colors.ink,
        }}
      >
        {caption}
      </Text>
    </View>
  );
}
