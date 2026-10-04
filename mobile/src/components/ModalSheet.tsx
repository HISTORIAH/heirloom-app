import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, space } from "@/theme";

/** Bottom sheet over the current screen, sized to its content. Scrim or back closes it. */
export function ModalSheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close"
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
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
