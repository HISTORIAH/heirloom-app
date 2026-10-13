import { Text } from "react-native";
import Animated, { Keyframe } from "react-native-reanimated";

import { colors } from "@/theme";

/** Rises 20px and fades in; the reverse on the way out. Reanimated keeps it mounted for the exit. */
const ENTER = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 20 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }] },
}).duration(300);

const EXIT = new Keyframe({
  0: { opacity: 1, transform: [{ translateY: 0 }] },
  100: { opacity: 0, transform: [{ translateY: 20 }] },
}).duration(300);

export function InkToast({ text }: { text?: string }) {
  if (text === undefined) return null;

  return (
    <Animated.View
      entering={ENTER}
      exiting={EXIT}
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 124,
        backgroundColor: colors.ink,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        zIndex: 6,
      }}
    >
      <Text
        style={{
          flex: 1,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 14,
          lineHeight: 20,
          color: colors.white,
        }}
      >
        {text}
      </Text>
    </Animated.View>
  );
}
