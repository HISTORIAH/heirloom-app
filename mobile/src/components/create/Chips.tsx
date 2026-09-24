import { Pressable, Text, View } from "react-native";

import { colors, space } from "@/theme";

export function PercentRow({
  selected,
  disabled,
  onPick,
}: {
  selected?: number;
  disabled?: boolean;
  onPick: (pct: number) => void;
}) {
  const pcts = [25, 50, 75, 100] as const;
  return (
    <View
      style={{
        marginTop: 12,
        flexDirection: "row",
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: space.radiusBtn,
        overflow: "hidden",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {pcts.map((pct, i) => {
        const on = selected === pct;
        return (
          <Pressable
            key={pct}
            onPress={() => {
              if (!disabled) onPick(pct);
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: on, disabled }}
            style={{
              flex: 1,
              paddingVertical: 12,
              minHeight: 44,
              alignItems: "center",
              backgroundColor: on ? colors.ink : colors.bg,
              borderLeftWidth: i === 0 ? 0 : 1,
              borderLeftColor: colors.line,
            }}
          >
            <Text
              style={{
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 11,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: on ? colors.white : colors.ink,
              }}
            >
              {pct === 100 ? "Max" : `${pct}%`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PresetChips({
  options,
  value,
  onPick,
}: {
  options: readonly number[];
  value: number;
  onPick: (n: number) => void;
}) {
  return (
    <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {options.map((n) => {
        const on = n === value;
        return (
          <Pressable
            key={n}
            onPress={() => onPick(n)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              minWidth: 44,
              minHeight: 44,
              paddingHorizontal: 12,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: space.radiusBtn,
              borderWidth: 1,
              borderColor: on ? colors.ink : colors.line,
              backgroundColor: on ? colors.ink : colors.bg,
            }}
          >
            <Text
              style={{
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 12,
                fontVariant: ["tabular-nums"],
                color: on ? colors.white : colors.ink,
              }}
            >
              {String(n)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
