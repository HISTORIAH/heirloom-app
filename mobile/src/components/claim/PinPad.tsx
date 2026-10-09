import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { ErrorLine } from "@/components/create/WizardChrome";
import { Cap, H2, Lede } from "@/components/ui";
import { PIN_MAX_LEN, PIN_MIN_LEN } from "@/lib";
import { colors, font, space } from "@/theme";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;

export function pinReady(digits: string): boolean {
  return digits.length >= PIN_MIN_LEN && digits.length <= PIN_MAX_LEN;
}

/** Numeric pad and masked dots. Digits stay in the parent. */
export function PinPad({
  cap,
  title,
  lede,
  digits,
  error,
  onDigit,
  onBackspace,
}: {
  cap: string;
  title: string;
  lede: string;
  digits: string;
  error?: string;
  onDigit: (d: string) => void;
  onBackspace: () => void;
}) {
  return (
    <View style={{ gap: 14 }}>
      <Cap>{cap}</Cap>
      <H2 size={22}>{title}</H2>
      <Lede>{lede}</Lede>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, minHeight: 18 }}>
        {Array.from({ length: Math.max(digits.length, PIN_MIN_LEN) }, (_, i) => (
          <View
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: i < digits.length ? colors.ink : colors.quiet,
            }}
          />
        ))}
      </View>
      <ErrorLine>{error}</ErrorLine>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
        {KEYS.map((key) => {
          if (key === "") {
            return <View key="pad" style={{ width: "33%", height: 56 }} />;
          }
          const back = key === "back";
          return (
            <Pressable
              key={key}
              onPress={() => {
                if (back) onBackspace();
                else if (digits.length < PIN_MAX_LEN) onDigit(key);
              }}
              accessibilityRole="button"
              accessibilityLabel={back ? "Delete" : key}
              style={({ pressed }) => ({
                width: "33%",
                height: 56,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.55 : 1,
              })}
            >
              {back ? (
                <Icon name="chevronLeft" size={18} color={colors.ink} />
              ) : (
                <Text style={{ fontFamily: font.semibold, fontSize: 24, color: colors.ink }}>{key}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
