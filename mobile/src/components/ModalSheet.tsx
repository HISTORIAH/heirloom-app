import { useEffect, useState, type ReactNode } from "react";
import { Keyboard, Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, space } from "@/theme";

function sheetPadBottom(keyboard: number, insetBottom: number): number {
  if (keyboard > 0) return keyboard + space.gap;
  return Math.max(insetBottom, 16) + 12;
}

/** Bottom sheet over the current screen, sized to its content. Scrim or back closes it. */
export function ModalSheet({
  children,
  onClose,
  dismissOnScrim = true,
}: {
  children: ReactNode;
  onClose: () => void;
  /** False while listening for NFC so a stray tap does not abort the hunt. */
  dismissOnScrim?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(0);

  useEffect(() => {
    const showName = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideName = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showName, (e) => {
      setKeyboard(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideName, () => {
      setKeyboard(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  function close() {
    Keyboard.dismiss();
    onClose();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          onPress={dismissOnScrim ? close : undefined}
          accessibilityLabel={dismissOnScrim ? "Close" : undefined}
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
            paddingBottom: sheetPadBottom(keyboard, insets.bottom),
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
          {children}
        </View>
      </View>
    </Modal>
  );
}
