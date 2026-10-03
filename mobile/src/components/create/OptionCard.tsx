import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/Icon";
import { Badge, RadioDot } from "@/components/ui";
import { colors, font, space } from "@/theme";

/** Radio card: title, body, optional tag, and content revealed when picked. */
export function OptionCard({
  on,
  title,
  body,
  icon,
  tag,
  tagAs = "text",
  onPress,
  children,
}: {
  on: boolean;
  title: string;
  body: string;
  icon?: IconName;
  tag?: string;
  /** "badge" is the yellow chip under the card; "text" is a tracked line inside it. */
  tagAs?: "badge" | "text";
  onPress: () => void;
  children?: ReactNode;
}) {
  return (
    <View
      style={{
        gap: 10,
        padding: 14,
        borderRadius: space.radiusTile,
        borderWidth: space.rule,
        borderColor: on ? colors.ink : colors.quiet,
        backgroundColor: on ? colors.paper : "transparent",
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        style={({ pressed }) => ({ flexDirection: "row", gap: 14, opacity: pressed ? 0.8 : 1 })}
      >
        <View style={{ marginTop: 2 }}>
          <RadioDot on={on} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {icon !== undefined ? <Icon name={icon} size={20} /> : null}
            <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 17, color: colors.ink }}>
              {title}
            </Text>
          </View>
          <Text
            style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.mute }}
          >
            {body}
          </Text>
          {tag !== undefined && tagAs === "text" ? (
            <Text
              style={{
                marginTop: 2,
                fontFamily: font.bold,
                fontSize: 11,
                letterSpacing: 0.66,
                textTransform: "uppercase",
                color: colors.ink,
              }}
            >
              {tag}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {tag !== undefined && tagAs === "badge" ? (
        <View style={{ marginLeft: 36, alignSelf: "flex-start" }}>
          <Badge label={tag} fill={colors.yellow} />
        </View>
      ) : null}
      {on && children !== undefined ? <View style={{ marginLeft: 36 }}>{children}</View> : null}
    </View>
  );
}
