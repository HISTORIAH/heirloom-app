import { useRef, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Cap, H2, Lede, PrimaryButton } from "@/components/ui";
import { colors } from "@/theme";

export type ConfirmAsk = {
  cap: string;
  title: string;
  body: string;
  cancelLabel?: string;
  confirmLabel: string;
  confirmTone?: "yellow" | "ink" | "sage";
};

export function ConfirmSheet({
  ask,
  onCancel,
  onConfirm,
}: {
  ask?: ConfirmAsk;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={ask !== undefined}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: "rgba(10,10,10,0.28)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: colors.soft,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
            borderTopWidth: 1,
            borderColor: colors.line,
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.line,
              alignSelf: "center",
              marginBottom: 18,
            }}
          />
          {ask ? (
            <>
              <Cap>{ask.cap}</Cap>
              <H2 size={22}>{ask.title}</H2>
              <Lede>{ask.body}</Lede>
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={ask.cancelLabel ?? "Not now"}
                    tone="sage"
                    onPress={onCancel}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={ask.confirmLabel}
                    tone={ask.confirmTone ?? "ink"}
                    onPress={onConfirm}
                  />
                </View>
              </View>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function useConfirmSheet() {
  const pending = useRef<(() => void) | undefined>(undefined);
  const [ask, setAsk] = useState<ConfirmAsk | undefined>(undefined);

  function prompt(next: ConfirmAsk, run: () => void) {
    pending.current = run;
    setAsk(next);
  }

  function cancel() {
    pending.current = undefined;
    setAsk(undefined);
  }

  function confirm() {
    const run = pending.current;
    pending.current = undefined;
    setAsk(undefined);
    run?.();
  }

  return { ask, prompt, cancel, confirm };
}
