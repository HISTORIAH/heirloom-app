import { useRouter } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, space } from "@/theme";

/**
 * Bottom sheet for transparent-modal routes (wallet, tap). Tapping the scrim
 * or the system back closes it via the router.
 */
export function RouteSheet({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rise = useSharedValue(0);

  useEffect(() => {
    rise.value = withTiming(1, { duration: 260 });
  }, [rise]);

  const panel = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - rise.value) * 48 }],
    opacity: rise.value,
  }));

  function close() {
    onClose?.();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  return (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Pressable
        onPress={close}
        accessibilityLabel="Close"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(10,10,10,0.55)",
        }}
      />
      <Animated.View
        accessibilityViewIsModal
        style={[
          {
            backgroundColor: colors.bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: space.rule,
            borderLeftWidth: space.rule,
            borderRightWidth: space.rule,
            borderColor: colors.ink,
            paddingHorizontal: space.pad,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          },
          panel,
        ]}
      >
        <View
          style={{
            width: 44,
            height: 5,
            borderRadius: 3,
            backgroundColor: colors.quiet,
            alignSelf: "center",
            marginBottom: 16,
          }}
        />
        {children}
      </Animated.View>
    </View>
  );
}
