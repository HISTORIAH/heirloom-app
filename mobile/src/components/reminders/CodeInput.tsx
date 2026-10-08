import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { VERIFY_CODE_LENGTH } from "@/constants/alerts";
import { normalizeCode } from "@/lib/reminders";
import { colors, font, space } from "@/theme";

const BOX_HEIGHT = 52;

/**
 * The email code as eight boxes, one per character, over a hidden input that does the typing,
 * pasting and one-time-code autofill. The box being typed into is yellow.
 */
export function CodeInput({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  error?: boolean;
  disabled?: boolean;
}) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(true);
  const cursor = Math.min(value.length, VERIFY_CODE_LENGTH - 1);

  return (
    <Pressable
      onPress={() => input.current?.focus()}
      accessibilityLabel={`Code, ${value.length} of ${VERIFY_CODE_LENGTH} characters`}
      style={{ flexDirection: "row", gap: 6 }}
    >
      {Array.from({ length: VERIFY_CODE_LENGTH }, (_, i) => {
        const char = value[i] ?? "";
        const active = focused && !disabled && i === cursor;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: BOX_HEIGHT,
              borderRadius: space.radiusSmall,
              borderWidth: space.rule,
              borderColor: error ? colors.claim : char || active ? colors.ink : colors.quiet,
              backgroundColor: active ? colors.yellow : colors.paper,
              alignItems: "center",
              justifyContent: "center",
              // A gap after the fourth box reads the code as two halves.
              marginRight: i === VERIFY_CODE_LENGTH / 2 - 1 ? 8 : 0,
            }}
          >
            <Text style={{ fontFamily: font.bold, fontSize: 20, color: colors.ink }}>{char}</Text>
          </View>
        );
      })}
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => onChange(normalizeCode(text).slice(0, VERIFY_CODE_LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus
        editable={!disabled}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        // No maxLength: a pasted "ABCD 2345" is longer than the code until it's normalised.
        caretHidden
        style={{ position: "absolute", width: "100%", height: "100%", opacity: 0 }}
      />
    </Pressable>
  );
}
