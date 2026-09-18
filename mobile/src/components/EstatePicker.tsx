import { Pressable, ScrollView, Text, View } from "react-native";

import type { EstateRow } from "@/lib/estates";
import { presentEstate } from "@/lib/presentEstate";
import { colors, space } from "@/theme";

interface EstatePickerProps {
  rows: EstateRow[];
  selected: number;
  onSelect: (index: number) => void;
}

/** Horizontal chip rail — switching only. Status lives in EstateDetail. */
export function EstatePicker({ rows, selected, onSelect }: EstatePickerProps) {
  if (rows.length <= 1) return null;

  return (
    <View style={{ paddingTop: 12, paddingBottom: 4 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 8,
          paddingHorizontal: 20,
          paddingBottom: 4,
        }}
      >
        {rows.map((row, i) => {
          const on = i === selected;
          const presentation = presentEstate(row.data, row.claimableLamports);
          const chipLabel = row.data.label.trim() || "Estate";
          return (
            <Pressable
              key={row.address}
              onPress={() => onSelect(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${chipLabel}, ${presentation.statusLabel}`}
              style={{
                minWidth: 124,
                maxWidth: 168,
                borderWidth: 1,
                borderColor: on ? colors.ink : colors.line,
                backgroundColor: on ? colors.ink : colors.bg,
                borderRadius: space.radiusBtn,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 14,
                  color: on ? colors.white : colors.ink,
                }}
              >
                {chipLabel}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  marginTop: 4,
                  fontFamily: "SpaceGrotesk_700Bold",
                  fontSize: 10,
                  letterSpacing: 1.1,
                  textTransform: "uppercase",
                  color: on ? colors.white : colors.mute,
                  opacity: on ? 0.7 : 1,
                }}
              >
                {presentation.statusLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {rows.length > 4 ? (
        <Text
          style={{
            marginTop: 8,
            paddingHorizontal: 20,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 13,
            color: colors.mute,
          }}
        >
          Scroll to reach every estate
        </Text>
      ) : null}
    </View>
  );
}
