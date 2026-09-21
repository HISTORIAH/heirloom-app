import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors, space } from "@/theme";

function CheckMark({ on }: { on: boolean }) {
  return (
    <View
      style={{
        width: 20,
        height: 20,
        marginTop: 2,
        borderWidth: 1,
        borderColor: colors.ink,
        borderRadius: 4,
        backgroundColor: on ? colors.ink : colors.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {on ? (
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 12.5l5 5 9-10"
            stroke={colors.white}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}

export function CheckRow({
  checked,
  onToggle,
  body,
  hint,
  boxed,
}: {
  checked: boolean;
  onToggle: () => void;
  body: string;
  hint?: string;
  boxed?: boolean;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginTop: boxed ? 16 : 0,
        padding: boxed ? 16 : 0,
        borderWidth: boxed ? 1 : 0,
        borderColor: boxed && checked ? colors.ink : colors.line,
        borderRadius: boxed ? space.radiusTile : 0,
        backgroundColor: boxed && checked ? colors.soft : colors.bg,
      }}
    >
      <CheckMark on={checked} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: boxed ? "SpaceGrotesk_500Medium" : "SpaceGrotesk_600SemiBold",
            fontSize: 14,
            lineHeight: 20,
            color: colors.ink,
          }}
        >
          {body}
        </Text>
        {hint ? (
          <Text
            style={{
              marginTop: 4,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 13,
              lineHeight: 18,
              color: colors.mute,
            }}
          >
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function EditLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Edit"
      style={{ paddingVertical: 8, paddingHorizontal: 4 }}
    >
      <Text
        style={{
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 11,
          letterSpacing: 1.98,
          textTransform: "uppercase",
          color: colors.mute,
          textDecorationLine: "underline",
        }}
      >
        Edit
      </Text>
    </Pressable>
  );
}
