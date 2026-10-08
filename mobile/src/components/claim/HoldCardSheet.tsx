import { useEffect } from "react";
import { BackHandler, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Cap, H2, Lede, PrimaryButton } from "@/components/ui";
import { colors, space } from "@/theme";

/**
 * In-window hunt chrome. A RN Modal is a Dialog and can drop IsoDep after the detect chime
 * (transceive fail). This overlay stays on the same Activity as reader mode.
 */
export function HoldCardSheet({ onCancel }: { onCancel: () => void }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [onCancel]);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        elevation: 20,
        justifyContent: "flex-end",
      }}
    >
      <View
        pointerEvents="auto"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.scrim,
        }}
      />
      <View
        accessibilityViewIsModal
        style={{
          backgroundColor: colors.bg,
          borderTopWidth: space.rule,
          borderColor: colors.ink,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 10,
          paddingHorizontal: space.pad,
          paddingBottom: Math.max(insets.bottom, 16) + 12,
          gap: 12,
        }}
      >
        <View
          style={{
            alignSelf: "center",
            width: 44,
            height: 5,
            borderRadius: 3,
            backgroundColor: colors.quiet,
          }}
        />
        <Cap>Claim</Cap>
        <H2 size={22}>Hold the card to the phone</H2>
        <Lede>
          Slide it slowly around the top of the back. A case makes the sweet spot small. Once the
          phone chimes, keep it still. Lifting then loses the card.
        </Lede>
        <PrimaryButton label="Not now" tone="paper" onPress={onCancel} />
      </View>
    </View>
  );
}
