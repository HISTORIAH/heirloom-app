import { useRef, useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { PresetChips } from "@/components/create/Chips";
import { Cap } from "@/components/ui";
import { colors, space } from "@/theme";

export function DaysField({
  value,
  min,
  max,
  presets,
  error,
  onChange,
  onLift,
}: {
  value: number;
  min: number;
  max: number;
  presets: readonly number[];
  error?: string;
  onChange: (n: number) => void;
  onLift?: (node: View) => void;
}) {
  const [text, setText] = useState(String(value));
  const box = useRef<View>(null);

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <View>
      <View
        ref={box}
        collapsable={false}
        style={{
          marginTop: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <TextInput
          value={text}
          onChangeText={(next) => {
            setText(next);
            if (!/^\d+$/.test(next.trim())) return;
            onChange(Number(next.trim()));
          }}
          onFocus={() => {
            const node = box.current;
            if (node === null || node === undefined) return;
            onLift?.(node);
          }}
          keyboardType="number-pad"
          placeholder={String(min)}
          placeholderTextColor={colors.mute}
          accessibilityLabel="Days"
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: error ? colors.claim : colors.line,
            borderRadius: space.radiusBtn,
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 28,
            lineHeight: 34,
            color: colors.ink,
            fontVariant: ["tabular-nums"],
            backgroundColor: colors.bg,
          }}
        />
        <Cap>days</Cap>
      </View>
      <PresetChips options={presets} value={value} onPick={onChange} />
      <Text
        style={{
          marginTop: 8,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 12,
          color: colors.mute,
        }}
      >
        {`${min}–${max} days`}
      </Text>
      {error ? (
        <Text
          style={{
            marginTop: 6,
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 12,
            color: colors.claim,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
