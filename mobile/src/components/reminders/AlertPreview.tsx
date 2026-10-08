import { Text, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

import { Icon } from "@/components/Icon";
import { HEIR_ALERT_TIMING } from "@/constants/alerts";
import { colors, font, space } from "@/theme";
import type { HeirProfile } from "@/types/reminders";

const AVATAR = 40;

/**
 * The heir alert's personal parts as they're typed: who it's from, who it's to, the note. Only
 * what the owner writes is drawn; the backend's own wording around it isn't repeated here.
 */
export function AlertPreview({ profile }: { profile: HeirProfile }) {
  const owner = profile.ownerName?.trim() ?? "";
  const heir = profile.heirName?.trim() ?? "";
  const note = profile.note?.trim() ?? "";

  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      accessible
      accessibilityLabel={`Preview. From ${owner || "you"} to ${heir || "your heir"}.${note ? ` Note: ${note}` : ""}`}
      style={{
        borderRadius: space.radiusTile,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: colors.ink,
        overflow: "hidden",
      }}
    >
      <View style={{ padding: space.tile, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: AVATAR,
              height: AVATAR,
              borderRadius: AVATAR / 2,
              backgroundColor: owner ? colors.yellow : colors.cardFace,
              borderWidth: space.rule,
              borderColor: owner ? colors.yellow : colors.mute,
              borderStyle: owner ? "solid" : "dashed",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: font.bold, fontSize: 18, color: colors.ink }}>
              {owner ? owner.charAt(0).toUpperCase() : ""}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: font.bold,
                fontSize: 16,
                color: owner ? colors.bg : colors.quiet,
              }}
            >
              {owner || "Your name"}
            </Text>
            <Text
              numberOfLines={1}
              style={{ fontFamily: font.regular, fontSize: 12, color: colors.quiet }}
            >
              {`to ${heir || "your heir"} · via Heirloom`}
            </Text>
          </View>
          <Icon name="bell" size={18} color={colors.quiet} />
        </View>

        {note ? (
          <Animated.View entering={FadeIn.duration(250)} style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ width: 3, borderRadius: 2, backgroundColor: colors.yellow }} />
            <Text
              style={{
                flex: 1,
                fontFamily: font.medium,
                fontSize: 16,
                lineHeight: 23,
                color: colors.bg,
              }}
            >
              {note}
            </Text>
          </Animated.View>
        ) : (
          <Text
            style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.mute }}
          >
            Your note shows here, in your words.
          </Text>
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: space.tile,
          paddingVertical: 10,
          backgroundColor: colors.cardFace,
        }}
      >
        <Icon name="clock" size={14} color={colors.quiet} />
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.quiet }}>
          {`Sent ${HEIR_ALERT_TIMING}`}
        </Text>
      </View>
    </Animated.View>
  );
}
