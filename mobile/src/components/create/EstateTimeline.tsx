import { useEffect, useState } from "react";
import { AccessibilityInfo, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Cap } from "@/components/ui";
import { HORIZON_DAYS } from "@/lib/estateTiming";
import { colors } from "@/theme";

export function EstateTimeline({
  heartbeatDays,
  graceDays,
  mini,
}: {
  heartbeatDays: number;
  graceDays: number;
  mini?: boolean;
}) {
  const [reduce, setReduce] = useState(false);
  const [trackW, setTrackW] = useState(0);
  const sage = useSharedValue(0);
  const yellow = useSharedValue(0);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (trackW <= 0) return;
    const anim = {
      duration: reduce ? 0 : 150,
      easing: Easing.out(Easing.cubic),
    };
    sage.value = withTiming((heartbeatDays / HORIZON_DAYS) * trackW, anim);
    yellow.value = withTiming((graceDays / HORIZON_DAYS) * trackW, anim);
  }, [heartbeatDays, graceDays, trackW, reduce, sage, yellow]);

  const sageStyle = useAnimatedStyle(() => ({
    width: sage.value,
  }));
  const yellowStyle = useAnimatedStyle(() => ({
    width: yellow.value,
  }));

  return (
    <View>
      <View
        onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
        style={{
          height: mini ? 8 : 12,
          borderRadius: 6,
          backgroundColor: colors.soft,
          overflow: "hidden",
          flexDirection: "row",
        }}
      >
        <Animated.View
          style={[{ height: "100%", backgroundColor: colors.sage }, sageStyle]}
        />
        <Animated.View
          style={[{ height: "100%", backgroundColor: colors.yellow }, yellowStyle]}
        />
      </View>
      {mini ? null : (
        <View
          style={{
            marginTop: 10,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Cap>Today</Cap>
          <Cap>Up to 15 months</Cap>
        </View>
      )}
    </View>
  );
}

export function TimelineCaptions({
  heartbeatDays,
  graceDays,
  openDate,
}: {
  heartbeatDays: number;
  graceDays: number;
  openDate: string;
}) {
  return (
    <View style={{ marginTop: 10, gap: 2 }}>
      <Text
        style={{
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 14,
          color: colors.mute,
        }}
      >
        {`Check in every ${heartbeatDays} days`}
      </Text>
      <Text
        style={{
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 14,
          color: colors.ink,
        }}
      >
        {`Estate opens ${openDate} · ${heartbeatDays} + ${graceDays} days`}
      </Text>
    </View>
  );
}
