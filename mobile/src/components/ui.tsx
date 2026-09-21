import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { colors, space } from "@/theme";

type BtnTone = "yellow" | "ink" | "sage";

const tones: Record<BtnTone, { bg: string; fg: string }> = {
  yellow: { bg: colors.yellow, fg: colors.ink },
  ink: { bg: colors.ink, fg: colors.white },
  sage: { bg: colors.sage, fg: colors.ink },
};

interface PrimaryButtonProps {
  /** Sentence case. This control uppercases and tracks. */
  label: string;
  onPress?: () => void;
  tone?: BtnTone;
  disabled?: boolean;
  compact?: boolean;
  inkBorder?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  tone = "yellow",
  disabled,
  compact,
  inkBorder,
}: PrimaryButtonProps) {
  const t = tones[tone];
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: compact ? undefined : "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.bg,
        borderRadius: space.radiusBtn,
        paddingVertical: compact ? 10 : 16,
        paddingHorizontal: compact ? 14 : 16,
        borderWidth: inkBorder ? 1.5 : 0,
        borderColor: inkBorder ? colors.ink : "transparent",
        opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
      })}
    >
      <Text
        style={{
          color: t.fg,
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: compact ? 11 : 13,
          letterSpacing: compact ? 0.8 : 1.04,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface TextLinkProps {
  label: string;
  onPress?: () => void;
  align?: "center" | "left";
  quiet?: boolean;
  flush?: boolean;
}

export function TextLink({ label, onPress, align = "center", quiet, flush }: TextLinkProps) {
  const color = quiet ? colors.mute : colors.ink;
  return (
    <Pressable onPress={onPress} style={{ marginTop: flush ? 8 : 16 }}>
      <Text
        style={{
          textAlign: align,
          fontFamily: quiet ? "SpaceGrotesk_500Medium" : "SpaceGrotesk_600SemiBold",
          fontSize: quiet ? 13 : 14,
          color,
          textDecorationLine: "underline",
          textDecorationColor: color,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface CapProps {
  /** Sentence case. This control uppercases and tracks. */
  children: string;
  color?: string;
}

export function Cap({ children, color = colors.mute }: CapProps) {
  return (
    <Text
      style={{
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 11,
        letterSpacing: 1.98,
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </Text>
  );
}

interface H2Props {
  children: string;
  size?: number;
}

export function H2({ children, size = 34 }: H2Props) {
  return (
    <Text
      style={{
        fontFamily: "SpaceGrotesk_600SemiBold",
        fontSize: size,
        letterSpacing: size * -0.035,
        lineHeight: size * 1.12,
        color: colors.ink,
        marginVertical: 8,
      }}
    >
      {children}
    </Text>
  );
}

interface LedeProps {
  children: string;
}

export function Lede({ children }: LedeProps) {
  return (
    <Text
      style={{
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 16,
        lineHeight: 24,
        color: colors.mute,
      }}
    >
      {children}
    </Text>
  );
}

interface TileProps {
  children: ReactNode;
  paper?: boolean;
  claim?: boolean;
  style?: object;
}

export function Tile({ children, paper, claim, style }: TileProps) {
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: claim ? colors.claim : colors.line,
          borderRadius: space.radiusTile,
          padding: space.tile,
          backgroundColor: paper ? colors.soft : colors.bg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface RowProps {
  left: string;
  right: string;
  muteLeft?: boolean;
}

export function Row({ left, right, muteLeft }: RowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
        marginVertical: 8,
      }}
    >
      <Text
        style={{
          fontFamily: muteLeft ? "SpaceGrotesk_700Bold" : "SpaceGrotesk_500Medium",
          fontSize: muteLeft ? 11 : 14,
          letterSpacing: muteLeft ? 1.98 : 0,
          textTransform: muteLeft ? "uppercase" : "none",
          color: muteLeft ? colors.mute : colors.ink,
          flexShrink: 1,
        }}
      >
        {left}
      </Text>
      <Text
        style={{
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 14,
          color: colors.ink,
        }}
      >
        {right}
      </Text>
    </View>
  );
}
