import { Pressable, ScrollView, Text } from "react-native";

import type { EstateRow } from "@/lib/estates";
import { presentEstate } from "@/lib/presentEstate";
import { colors, space } from "@/theme";

interface EstateStripProps {
  rows: EstateRow[];
  selected: number;
  onSelect: (index: number) => void;
}

export function EstateStrip({ rows, selected, onSelect }: EstateStripProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 12 }}
    >
      {rows.map((row, i) => {
        const on = i === selected;
        const label = row.data.label.trim() || "Estate";
        const { stripMeta } = presentEstate(row.data, row.claimableLamports);
        return (
          <Pressable
            key={row.address}
            onPress={() => onSelect(i)}
            style={{
              borderWidth: 1,
              borderColor: on ? colors.ink : colors.line,
              backgroundColor: on ? colors.ink : colors.bg,
              borderRadius: space.radiusBtn,
              paddingVertical: 10,
              paddingHorizontal: 14,
              minWidth: 132,
            }}
          >
            <Text
              style={{
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 14,
                color: on ? colors.white : colors.ink,
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                marginTop: 2,
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: on ? colors.white : colors.ink,
                opacity: 0.6,
              }}
            >
              {stripMeta}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
