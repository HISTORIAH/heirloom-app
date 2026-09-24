import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { Cap } from "@/components/ui";
import { colors, space } from "@/theme";

export function CreateField({
  label,
  hint,
  value,
  placeholder,
  error,
  maxLength,
  showCounter,
  keyboardType,
  trailing,
  onChangeText,
  onLift,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  error?: string;
  maxLength?: number;
  showCounter?: boolean;
  keyboardType?: "default" | "decimal-pad";
  trailing?: ReactNode;
  onChangeText: (v: string) => void;
  onLift?: (node: View) => void;
}) {
  const [focused, setFocused] = useState(false);
  const box = useRef<View>(null);
  const border = error ? colors.claim : focused ? colors.ink : colors.line;
  return (
    <View ref={box} collapsable={false} style={{ marginTop: 20 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Cap>{label}</Cap>
        {showCounter && maxLength !== undefined ? (
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 11,
              letterSpacing: 1.2,
              color: colors.mute,
            }}
          >
            {`${value.length} / ${maxLength}`}
          </Text>
        ) : null}
      </View>
      <View style={{ marginTop: 8 }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mute}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          keyboardType={keyboardType}
          maxLength={maxLength}
          onFocus={() => {
            setFocused(true);
            const node = box.current;
            if (node === null || node === undefined) return;
            onLift?.(node);
          }}
          onBlur={() => setFocused(false)}
          style={{
            paddingVertical: 12,
            paddingLeft: 14,
            paddingRight: trailing !== undefined ? 48 : 14,
            borderWidth: 1,
            borderColor: border,
            borderRadius: space.radiusBtn,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 14,
            color: colors.ink,
            backgroundColor: colors.bg,
          }}
        />
        {trailing !== undefined ? (
          <View
            style={{
              position: "absolute",
              right: 4,
              top: 0,
              bottom: 0,
              justifyContent: "center",
            }}
          >
            {trailing}
          </View>
        ) : null}
      </View>
      {hint ? (
        <Text
          style={{
            marginTop: 8,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 13,
            lineHeight: 18,
            color: colors.mute,
          }}
        >
          {hint}
        </Text>
      ) : null}
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
