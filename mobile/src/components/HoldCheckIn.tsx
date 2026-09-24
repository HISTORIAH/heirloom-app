import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/theme";

const HOLD_MS = 1000;

function holdPaint(tone: "ink" | "yellow"): {
  ground: string;
  label: string;
  fill: string;
  fillLabel: string;
} {
  if (tone === "yellow") {
    return {
      ground: colors.yellow,
      label: colors.ink,
      fill: colors.ink,
      fillLabel: colors.yellow,
    };
  }
  return {
    ground: colors.ink,
    label: colors.white,
    fill: colors.white,
    fillLabel: colors.ink,
  };
}

function HoldLabel({ color, text }: { color: string; text: string }) {
  return (
    <Text
      style={{
        fontFamily: "SpaceGrotesk_600SemiBold",
        fontSize: 16,
        color,
      }}
    >
      {text}
    </Text>
  );
}

export function HoldCheckIn({
  label,
  busy,
  disabled,
  tone = "ink",
  onComplete,
  onHoldingChange,
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  tone?: "ink" | "yellow";
  onComplete: () => void;
  onHoldingChange?: (holding: boolean) => void;
}) {
  const progress = useSharedValue(0);
  const measured = useSharedValue(0);
  const opacity = useSharedValue(1);
  const holding = useRef(false);
  const fired = useRef(false);
  const [box, setBox] = useState(0);
  const painted = busy ? "Approve in your wallet…" : label;
  const paint = holdPaint(tone);
  const locked = Boolean(busy) || Boolean(disabled);

  const fillStyle = useAnimatedStyle(() => ({
    width: measured.value * progress.value,
  }));
  const breatheStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const fire = useCallback(() => {
    if (fired.current) return;
    fired.current = true;
    holding.current = false;
    onHoldingChange?.(false);
    onComplete();
  }, [onComplete, onHoldingChange]);

  function begin() {
    if (locked || fired.current) return;
    holding.current = true;
    onHoldingChange?.(true);
    const remaining = Math.max(0, 1 - progress.value);
    progress.value = withTiming(
      1,
      { duration: HOLD_MS * remaining, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(fire)();
      },
    );
  }

  function end() {
    if (!holding.current) return;
    holding.current = false;
    onHoldingChange?.(false);
    if (fired.current) return;
    cancelAnimation(progress);
    const rewind = (progress.value * HOLD_MS) / 2.5;
    progress.value = withTiming(0, { duration: rewind });
  }

  useEffect(() => {
    if (busy) {
      opacity.value = withRepeat(
        withTiming(0.7, { duration: 550, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
      return;
    }
    cancelAnimation(opacity);
    opacity.value = 1;
    fired.current = false;
    holding.current = false;
    onHoldingChange?.(false);
    progress.value = withTiming(0, { duration: 200 });
  }, [busy, onHoldingChange, opacity, progress]);

  return (
    <Animated.View style={[{ marginTop: 22 }, breatheStyle]}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={painted}
        accessibilityHint="Hold for one second, then approve in your wallet"
        accessibilityState={{ disabled: locked, busy: Boolean(busy) }}
        collapsable={false}
        onStartShouldSetResponder={() => !locked}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={begin}
        onResponderRelease={end}
        onResponderTerminate={end}
        onLayout={(ev) => {
          const width = ev.nativeEvent.layout.width;
          setBox(width);
          measured.value = width;
        }}
        style={{
          height: 60,
          borderRadius: 16,
          backgroundColor: paint.ground,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          opacity: locked && !busy ? 0.45 : 1,
        }}
      >
        <HoldLabel color={paint.label} text={painted} />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              backgroundColor: paint.fill,
              overflow: "hidden",
            },
            fillStyle,
          ]}
        >
          <View
            style={{
              width: box,
              height: 60,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <HoldLabel color={paint.fillLabel} text={painted} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
