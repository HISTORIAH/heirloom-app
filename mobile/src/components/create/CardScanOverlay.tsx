import { useEffect } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { NfcDummyCard } from "@/components/NfcDummyCard";
import { colors } from "@/theme";

export function CardScanOverlay({
  role,
  onCancel,
}: {
  role?: "heir" | "signer";
  onCancel: () => void;
}) {
  const listening = role !== undefined;
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!listening) {
      pulse.value = withTiming(1, { duration: 180 });
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [listening, pulse]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));
  const who =
    role === "signer"
      ? "This becomes the check-in signer."
      : "This becomes the heir.";

  return (
    <Modal
      visible={listening}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel scan"
        style={{
          flex: 1,
          backgroundColor: "rgba(10,10,10,0.45)",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: colors.yellow,
            borderRadius: 32,
            paddingHorizontal: 22,
            paddingTop: 28,
            paddingBottom: 26,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 28,
              lineHeight: 32,
              letterSpacing: -0.6,
              color: colors.ink,
              textAlign: "center",
            }}
          >
            Hold the card to the back of the phone
          </Text>
          <Text
            style={{
              marginTop: 10,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 15,
              lineHeight: 20,
              color: colors.ink,
              textAlign: "center",
            }}
          >
            {who}
          </Text>
          <Animated.View style={[{ marginTop: 22 }, cardStyle]}>
            <NfcDummyCard width={240} />
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
