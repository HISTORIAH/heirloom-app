import { useEffect, useState } from "react";
import { Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/theme";

export function InkToast({ text }: { text?: string }) {
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (text !== undefined) {
      setMessage(text);
      setMounted(true);
      progress.value = withTiming(1, { duration: 300 });
      return;
    }
    progress.value = withTiming(0, { duration: 300 });
    const id = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(id);
  }, [text, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 20 }],
  }));

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 104,
          backgroundColor: colors.ink,
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 16,
          zIndex: 6,
        },
        style,
      ]}
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
        {message}
      </Text>
    </Animated.View>
  );
}
