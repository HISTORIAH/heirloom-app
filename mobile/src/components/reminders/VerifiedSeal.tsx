import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { colors, space } from "@/theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Frame and seal size, and how far the rays fly. Drawn for this seal only. */
const FRAME = 168;
const SEAL = 104;
const RAYS = 12;
const RAY_FROM = SEAL / 2 + 6;
const RAY_TO = SEAL / 2 + 30;
/** "M30 53 l14 14 l30 -32" in the 104 box: two legs, about 19.8 + 43.9 long. */
const CHECK = "M30 53 l14 14 l30 -32";
const CHECK_LENGTH = 64;
const RAY_FILLS = [colors.yellow, colors.ink, colors.orange, colors.sky];

function Ray({ index, burst }: { index: number; burst: SharedValue<number> }) {
  const angle = (360 / RAYS) * index;
  const long = index % 2 === 0;
  const style = useAnimatedStyle(() => {
    const distance = RAY_FROM + (RAY_TO - RAY_FROM) * burst.value;
    return {
      // In fast, hold, then out: none show before the seal has popped.
      opacity:
        burst.value < 0.1
          ? burst.value / 0.1
          : burst.value < 0.6
            ? 1
            : 1 - (burst.value - 0.6) / 0.4,
      transform: [
        { rotate: `${angle}deg` },
        { translateY: -distance },
        { scaleY: 1 - burst.value * 0.6 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: FRAME / 2 - 3,
          top: FRAME / 2 - (long ? 9 : 6),
          width: 6,
          height: long ? 18 : 12,
          borderRadius: 3,
          backgroundColor: RAY_FILLS[index % RAY_FILLS.length],
        },
        style,
      ]}
    />
  );
}

/**
 * The "you're connected" moment: a lime seal springs in, the check draws itself, rays burst out
 * and a ring ripples away. Plays once on mount.
 */
export function VerifiedSeal() {
  const pop = useSharedValue(0);
  const draw = useSharedValue(0);
  const burst = useSharedValue(0);
  const ripple = useSharedValue(0);

  useEffect(() => {
    pop.value = withSpring(1, { damping: 9, stiffness: 160, mass: 0.7 });
    draw.value = withDelay(200, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    burst.value = withDelay(260, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }));
    ripple.value = withDelay(
      320,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
  }, [pop, draw, burst, ripple]);

  const seal = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }, { rotate: `${(1 - pop.value) * -25}deg` }],
  }));
  const ring = useAnimatedStyle(() => ({
    opacity: 1 - ripple.value,
    transform: [{ scale: 1 + ripple.value * 0.55 }],
  }));
  const check = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - draw.value),
  }));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Connected"
      style={{ width: FRAME, height: FRAME, alignSelf: "center" }}
    >
      {Array.from({ length: RAYS }, (_, i) => (
        <Ray key={i} index={i} burst={burst} />
      ))}
      <Animated.View
        style={[
          {
            position: "absolute",
            left: (FRAME - SEAL) / 2,
            top: (FRAME - SEAL) / 2,
            width: SEAL,
            height: SEAL,
            borderRadius: SEAL / 2,
            borderWidth: space.rule,
            borderColor: colors.ink,
          },
          ring,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            left: (FRAME - SEAL) / 2,
            top: (FRAME - SEAL) / 2,
            width: SEAL,
            height: SEAL,
            borderRadius: SEAL / 2,
            borderWidth: space.rule,
            borderColor: colors.ink,
            backgroundColor: colors.lime,
          },
          seal,
        ]}
      >
        <Svg width={SEAL - space.rule * 2} height={SEAL - space.rule * 2} viewBox="0 0 104 104">
          <AnimatedPath
            d={CHECK}
            stroke={colors.ink}
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={CHECK_LENGTH}
            animatedProps={check}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
