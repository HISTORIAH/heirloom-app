import { useEffect } from "react";
import type { DimensionValue, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { SKELETON_FADED, SKELETON_PULSE_MS } from "@/constants/ui";
import { colors } from "@/theme";

/** A placeholder for content still loading. Pulses in opacity; no shimmer. */
export function SkeletonBlock({
  width,
  height,
  radius = 6,
  onCard,
  style,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  /** On a coloured card (the estate card) rather than the page. */
  onCard?: boolean;
  style?: ViewStyle;
}) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    const ease = { duration: SKELETON_PULSE_MS, easing: Easing.inOut(Easing.ease) };
    opacity.set(
      withRepeat(withSequence(withTiming(SKELETON_FADED, ease), withTiming(1, ease)), -1),
    );
  }, [opacity]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: onCard ? colors.skeletonOnCard : colors.line,
        },
        style,
        pulse,
      ]}
    />
  );
}
