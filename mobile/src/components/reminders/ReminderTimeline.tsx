import { Text, View } from "react-native";

import { HEIR_ALERT_TIMING, REMINDER_SCHEDULE, REMINDER_TIMELINE } from "@/constants/alerts";
import { colors, font, space } from "@/theme";
import type { TimelineStop } from "@/types/reminders";

const DOT = 14;

const DOT_FILL: Record<TimelineStop["phase"], string> = {
  "check-in": colors.paper,
  grace: colors.orangeSoft,
  heir: colors.orange,
};

/**
 * When reminders go out, as five stops on one line: ink up to the due day, orange through
 * grace to the heir alert. The rails run centre to centre of the outer stops (10%–90%).
 */
export function ReminderTimeline() {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Reminders go out ${REMINDER_SCHEDULE.map((s) => s.toLowerCase()).join(", ")}. Your heir is told ${HEIR_ALERT_TIMING}.`}
      style={{
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderWidth: space.rule,
        borderColor: colors.line,
        borderRadius: space.radiusBtn,
        backgroundColor: colors.paper,
      }}
    >
      <View>
        <View
          style={{
            position: "absolute",
            top: DOT / 2 - 1,
            left: "10%",
            right: "50%",
            height: 2,
            backgroundColor: colors.ink,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: DOT / 2 - 2,
            left: "50%",
            right: "10%",
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.orange,
          }}
        />
        <View style={{ flexDirection: "row" }}>
          {REMINDER_TIMELINE.map((stop) => (
            <View key={stop.title} style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <View
                style={{
                  width: DOT,
                  height: DOT,
                  borderRadius: DOT / 2,
                  borderWidth: space.rule,
                  borderColor: colors.ink,
                  backgroundColor: DOT_FILL[stop.phase],
                }}
              />
              <Text
                style={{
                  textAlign: "center",
                  fontFamily: font.bold,
                  fontSize: 12,
                  lineHeight: 14,
                  color: colors.ink,
                }}
              >
                {`${stop.title}\n`}
                <Text style={{ fontFamily: font.medium, color: colors.mute }}>{stop.sub}</Text>
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
