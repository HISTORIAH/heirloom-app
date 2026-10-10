import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Cap, H2, Lede, PrimaryButton, TextLink } from "@/components/ui";
import { colors } from "@/theme";
import type { ConfirmAsk } from "@/types/ui";

function soloKind(kind?: ConfirmAsk["kind"]): boolean {
  return kind === "notice" || kind === "fail";
}

function SheetActions({
  ask,
  onCancel,
  onConfirm,
  onExtra,
}: {
  ask: ConfirmAsk;
  onCancel: () => void;
  onConfirm: () => void;
  onExtra: () => void;
}) {
  if (soloKind(ask.kind)) {
    return (
      <View style={{ marginTop: 20 }}>
        <PrimaryButton
          label={ask.confirmLabel}
          tone={ask.confirmTone ?? "yellow"}
          onPress={onConfirm}
        />
        {ask.extraLabel !== undefined ? (
          <TextLink label={ask.extraLabel} onPress={onExtra} />
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        marginTop: 20,
      }}
    >
      <View style={{ flex: 1 }}>
        <PrimaryButton label={ask.cancelLabel ?? "Not now"} tone="paper" onPress={onCancel} />
      </View>
      <View style={{ flex: 1 }}>
        <PrimaryButton
          label={ask.confirmLabel}
          tone={ask.confirmTone ?? "ink"}
          onPress={onConfirm}
        />
      </View>
    </View>
  );
}

export function ConfirmSheet({
  ask,
  onCancel,
  onConfirm,
  onExtra,
}: {
  ask?: ConfirmAsk;
  onCancel: () => void;
  onConfirm: () => void;
  onExtra: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={ask !== undefined} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: "rgba(10,10,10,0.55)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: colors.soft,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
            borderTopWidth: 2,
            borderLeftWidth: 2,
            borderRightWidth: 2,
            borderColor: colors.ink,
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 3,
              backgroundColor: colors.quiet,
              alignSelf: "center",
              marginBottom: 18,
            }}
          />
          {ask ? (
            <>
              <Cap color={ask.kind === "fail" ? colors.claim : colors.mute}>{ask.cap}</Cap>
              <H2 size={22}>{ask.title}</H2>
              {ask.body !== undefined ? <Lede>{ask.body}</Lede> : null}
              <SheetActions ask={ask} onCancel={onCancel} onConfirm={onConfirm} onExtra={onExtra} />
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
