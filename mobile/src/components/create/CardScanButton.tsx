import { Pressable } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { colors } from "@/theme";

function CardGlyph() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke={colors.ink}
        strokeWidth="1.8"
      />
      <Path d="M3 9.5h18" stroke={colors.ink} strokeWidth="1.8" />
      <Rect
        x="6"
        y="12.2"
        width="4.2"
        height="3"
        rx="0.6"
        stroke={colors.ink}
        strokeWidth="1.6"
      />
    </Svg>
  );
}

export function CardScanButton({
  label,
  busy,
  onPress,
}: {
  label: string;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        opacity: busy ? 0.45 : pressed ? 0.72 : 1,
      })}
    >
      <CardGlyph />
    </Pressable>
  );
}
