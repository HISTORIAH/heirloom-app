import { Alert, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Cap } from "@/components/ui";
import { colors, space } from "@/theme";

type EverydayAction = "heir" | "timing" | "asset";

const EVERYDAY: Record<
  EverydayAction,
  { title: string; consequence: string; later: string }
> = {
  heir: {
    title: "Change heir",
    consequence: "Migrates this vault to a new heir address",
    later: "Reassign heir lands in the manage slice.",
  },
  timing: {
    title: "Update timing",
    consequence: "Changes check-in, grace, pause, and the label",
    later: "Edit settings lands in the manage slice.",
  },
  asset: {
    title: "Add asset",
    consequence: "Register another SPL token account in the vault",
    later: "Add asset lands in the manage slice.",
  },
};

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

function comingNext(body: string) {
  Alert.alert("Coming next", body);
}

function EverydayRow({
  action,
  last,
}: {
  action: EverydayAction;
  last?: boolean;
}) {
  const copy = EVERYDAY[action];
  return (
    <Pressable
      onPress={() => comingNext(copy.later)}
      accessibilityRole="button"
      accessibilityLabel={copy.title}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        opacity: pressed ? 0.72 : 1,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.line,
      })}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 16,
            letterSpacing: -0.2,
            color: colors.ink,
          }}
        >
          {copy.title}
        </Text>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 13,
            lineHeight: 18,
            color: colors.mute,
          }}
        >
          {copy.consequence}
        </Text>
      </View>
      <Chevron />
    </Pressable>
  );
}

function onClosePress() {
  Alert.alert(
    "Close this estate?",
    "Assets return to you. The heir can no longer claim. This cannot be undone.",
    [
      { text: "Keep estate", style: "cancel" },
      {
        text: "Close estate",
        style: "destructive",
        onPress: () =>
          comingNext("Emergency withdraw lands in the manage slice."),
      },
    ],
  );
}

/**
 * Owner control board. Everyday verbs in a numbered list; close estate sits
 * in a separated red well so it cannot be mistaken for check-in or add-asset.
 */
export function EstateManage() {
  return (
    <View style={{ gap: 12 }}>
      <Cap>Manage</Cap>

      <View
        style={{
          borderWidth: 1,
          borderColor: colors.ink,
          borderRadius: space.radiusTile,
          backgroundColor: colors.bg,
          overflow: "hidden",
        }}
      >
        <EverydayRow action="heir" />
        <EverydayRow action="timing" />
        <EverydayRow action="asset" last />
      </View>

      <View
        style={{
          borderWidth: 1.5,
          borderColor: colors.claim,
          borderRadius: space.radiusTile,
          backgroundColor: colors.bg,
          padding: 16,
          gap: 12,
        }}
      >
        <View
          style={{
            alignSelf: "flex-start",
            borderWidth: 1,
            borderColor: colors.claim,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: colors.bg,
          }}
        >
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: colors.claim,
            }}
          >
            Danger
          </Text>
        </View>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 18,
            letterSpacing: -0.3,
            color: colors.ink,
          }}
        >
          Close estate
        </Text>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 14,
            lineHeight: 20,
            color: colors.mute,
          }}
        >
          Returns every locked asset to you and ends this vault. The heir loses the claim.
        </Text>
        <Pressable
          onPress={onClosePress}
          accessibilityRole="button"
          accessibilityLabel="Close estate"
          style={({ pressed }) => ({
            borderWidth: 1.5,
            borderColor: colors.claim,
            borderRadius: space.radiusBtn,
            paddingVertical: 14,
            alignItems: "center",
            backgroundColor: pressed ? "rgba(255,59,59,0.08)" : colors.bg,
          })}
        >
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 13,
              letterSpacing: 1.04,
              textTransform: "uppercase",
              color: colors.claim,
            }}
          >
            Close estate
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
