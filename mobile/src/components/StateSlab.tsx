import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme";

export function StateSlab({
  color,
  eyebrow,
  value,
  unit,
  advice,
  headline,
  underStatusBar = false,
  fg = colors.ink,
  leading,
  children,
}: {
  color: string;
  eyebrow?: string;
  value?: string;
  unit?: string;
  advice?: string;
  headline?: string;
  underStatusBar?: boolean;
  fg?: string;
  leading?: ReactNode;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const showFigure = value !== undefined && unit !== undefined;

  return (
    <View
      style={{
        backgroundColor: color,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        paddingHorizontal: 20,
        paddingBottom: 22,
        paddingTop: underStatusBar ? Math.max(insets.top, 8) : 8,
      }}
    >
      {leading}
      {eyebrow !== undefined ? (
        <Text
          style={{
            marginTop: leading !== undefined ? 20 : 12,
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 15,
            color: fg,
          }}
        >
          {eyebrow}
        </Text>
      ) : null}
      {headline !== undefined ? (
        <Text
          style={{
            marginTop: 12,
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 28,
            letterSpacing: -0.6,
            lineHeight: 34,
            color: fg,
          }}
        >
          {headline}
        </Text>
      ) : null}
      {showFigure ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 14,
            marginTop: 6,
          }}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.4}
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 148,
              letterSpacing: -10,
              lineHeight: 116,
              fontVariant: ["tabular-nums"],
              includeFontPadding: false,
              color: fg,
              marginLeft: -6,
            }}
          >
            {value}
          </Text>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 24,
              letterSpacing: -0.5,
              color: fg,
              paddingBottom: 2,
            }}
          >
            {unit}
          </Text>
        </View>
      ) : null}
      {advice !== undefined ? (
        <Text
          style={{
            marginTop: 14,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 15,
            lineHeight: 21,
            color: fg,
            maxWidth: 300,
          }}
        >
          {advice}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
