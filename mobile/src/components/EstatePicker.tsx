import { Pressable, ScrollView, Text, View } from "react-native";

import { VaultMark } from "@/components/VaultMark";
import type { EstateRow } from "@/lib/estates";
import { formatSol, presentEstate } from "@/lib/presentEstate";
import { colors } from "@/theme";

interface EstatePickerProps {
  rows: EstateRow[];
  selected: number;
  onSelect: (index: number) => void;
}

/** Horizontal vault tabs inside the slab. Hidden when there is one estate. */
export function EstatePicker({ rows, selected, onSelect }: EstatePickerProps) {
  if (rows.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: 6, marginHorizontal: -20 }}
      contentContainerStyle={{
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 4,
      }}
    >
      {rows.map((row, i) => {
        const on = i === selected;
        const presentation = presentEstate(row.data, row.claimableLamports);
        const chipLabel = row.data.label.trim() || "Estate";
        const meta = `${formatSol(row.claimableLamports)} SOL`;
        const fg = on ? colors.white : colors.ink;
        return (
          <Pressable
            key={row.address}
            onPress={() => onSelect(i)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${chipLabel}, ${meta}, ${presentation.statusLabel}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              borderWidth: 1.5,
              borderColor: colors.ink,
              backgroundColor: on ? colors.ink : "transparent",
              borderRadius: 16,
              paddingVertical: 8,
              paddingHorizontal: 12,
            }}
          >
            <VaultMark size={16} color={fg} />
            <View>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: "SpaceGrotesk_700Bold",
                  fontSize: 15,
                  color: fg,
                }}
              >
                {chipLabel}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  marginTop: 1,
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 11,
                  fontVariant: ["tabular-nums"],
                  color: fg,
                }}
              >
                {meta}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
