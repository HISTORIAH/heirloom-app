import { Text, View } from "react-native";

import { SkeletonBlock } from "@/components/Skeleton";
import { colors, font, space } from "@/theme";

/** Heir, Assets, Check-in, Check-in signer, Guardian: label and value widths. */
const FACT_ROWS: [number, number][] = [
  [48, 96],
  [62, 56],
  [70, 150],
  [110, 40],
  [74, 48],
];

/** The estates tab while it loads: one estate card and its fact rows, in their real shapes. */
export function EstatesSkeleton({ network }: { network: string }) {
  return (
    <View accessibilityLabel="Loading your estates" style={{ gap: 16 }}>
      <View
        style={{
          backgroundColor: colors.yellowMuted,
          borderWidth: space.rule,
          borderColor: colors.ink,
          borderRadius: space.radiusHero,
          paddingVertical: 18,
          paddingHorizontal: 18,
          gap: 14,
        }}
      >
        <View
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        >
          <SkeletonBlock onCard width={96} height={18} />
          <SkeletonBlock onCard width={70} height={24} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
          <SkeletonBlock onCard width={96} height={72} radius={10} />
          <SkeletonBlock onCard width={140} height={18} style={{ marginBottom: 8 }} />
        </View>
        <SkeletonBlock onCard height={22} radius={4} />
        <SkeletonBlock onCard height={56} radius={space.radiusBtn} />
      </View>

      <View>
        {FACT_ROWS.map(([label, value], index) => (
          <View
            key={index}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 15,
              borderTopWidth: index === 0 ? 0 : space.rule,
              borderTopColor: colors.line,
            }}
          >
            <SkeletonBlock width={label} height={14} />
            <SkeletonBlock width={value} height={14} />
          </View>
        ))}
      </View>

      <Text
        style={{ fontFamily: font.regular, fontSize: 13, color: colors.mute, textAlign: "center" }}
      >
        Reading your estates from {network}
      </Text>
    </View>
  );
}
