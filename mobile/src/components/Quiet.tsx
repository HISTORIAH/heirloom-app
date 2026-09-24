import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { shortAddress } from "@/lib/address";
import { colors } from "@/theme";

export function SectionLabel({ title, aside }: { title: string; aside?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 14,
      }}
    >
      <Text
        style={{
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 13,
          color: colors.mute,
        }}
      >
        {title}
      </Text>
      {aside !== undefined ? (
        <Text
          style={{
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 13,
            color: colors.mute,
          }}
        >
          {aside}
        </Text>
      ) : null}
    </View>
  );
}

function Chevron() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5.5L15.5 12 9 18.5"
        stroke={colors.ink}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function RowAddress({ address }: { address: string }) {
  return (
    <Text
      style={{
        fontFamily: "SpaceGrotesk_600SemiBold",
        fontSize: 15,
        fontVariant: ["tabular-nums"],
        color: colors.ink,
      }}
    >
      {shortAddress(address)}
    </Text>
  );
}

export function QuietRow({
  title,
  desc,
  right,
  footer,
  onPress,
  danger,
  selected,
  rule = colors.line,
}: {
  title: string;
  desc?: string;
  right?: ReactNode;
  footer?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  selected?: boolean;
  rule?: string;
}) {
  const body = (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 16,
              color: danger ? colors.claim : colors.ink,
            }}
          >
            {title}
          </Text>
          {desc !== undefined ? (
            <Text
              style={{
                marginTop: 3,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 13,
                lineHeight: 18,
                color: colors.mute,
              }}
            >
              {desc}
            </Text>
          ) : null}
        </View>
        {right}
        {onPress !== undefined && right === undefined ? <Chevron /> : null}
      </View>
      {footer}
    </>
  );

  const frame = {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: rule,
    backgroundColor: selected ? colors.soft : "transparent",
  };

  if (onPress === undefined) {
    return <View style={frame}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        ...frame,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      {body}
    </Pressable>
  );
}
