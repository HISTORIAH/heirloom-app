import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { Icon, type IconName } from "@/components/Icon";
import { REMINDER_CHANNELS, SOON_REMINDER_CHANNELS, TAB_SPRING } from "@/constants/alerts";
import { colors, font, space } from "@/theme";
import type { ReminderChannel } from "@/types/reminders";

/** Inset between the frame and the sliding pill. */
const INSET = 4;
const HEIGHT = 48;

const ICON: Partial<Record<ReminderChannel, IconName>> = {
  telegram: "telegram",
  email: "mail",
  sms: "phone",
};

/**
 * Segmented channel picker: an ink pill slides under the picked tab. Channels this role already
 * has are left out; SMS sits at the end, greyed, until the backend delivers it.
 */
export function ChannelTabs({
  channels,
  value,
  onChange,
  disabled,
}: {
  channels: ReminderChannel[];
  value: ReminderChannel;
  onChange: (channel: ReminderChannel) => void;
  disabled?: boolean;
}) {
  const tabs = [
    ...REMINDER_CHANNELS.filter((item) => channels.includes(item.channel)).map((item) => ({
      ...item,
      soon: false,
    })),
    ...SOON_REMINDER_CHANNELS.map((item) => ({ ...item, soon: true })),
  ];
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.channel === value),
  );
  const [width, setWidth] = useState(0);
  // The layout width includes the rule on both sides; the pill moves inside it.
  const segment = width === 0 ? 0 : (width - (INSET + space.rule) * 2) / tabs.length;
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withSpring(index * segment, TAB_SPRING);
  }, [index, segment, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        height: HEIGHT,
        flexDirection: "row",
        padding: INSET,
        borderRadius: space.radiusBtn,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: colors.paper,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {segment > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: INSET,
              left: INSET,
              width: segment,
              height: HEIGHT - (INSET + space.rule) * 2,
              borderRadius: space.radiusSmall - 2,
              backgroundColor: colors.ink,
            },
            pill,
          ]}
        />
      ) : null}
      {tabs.map((tab) => {
        const on = !tab.soon && tab.channel === value;
        const tint = on ? colors.bg : tab.soon ? colors.quiet : colors.ink;
        const icon = ICON[tab.channel];
        return (
          <Pressable
            key={tab.channel}
            disabled={tab.soon || disabled}
            onPress={() => onChange(tab.channel)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on, disabled: tab.soon || disabled }}
            accessibilityLabel={tab.soon ? `${tab.label}, coming soon` : tab.label}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {icon !== undefined ? <Icon name={icon} size={16} weight={2.4} color={tint} /> : null}
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: tint }}>{tab.label}</Text>
            {tab.soon ? (
              <Text
                style={{
                  fontFamily: font.bold,
                  fontSize: 9,
                  letterSpacing: 1,
                  color: colors.quiet,
                }}
              >
                SOON
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
