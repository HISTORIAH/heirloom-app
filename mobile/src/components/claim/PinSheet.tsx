import { useEffect } from "react";
import { BackHandler, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PinPad, pinReady } from "@/components/claim/PinPad";
import { PrimaryButton } from "@/components/ui";
import { colors, space } from "@/theme";

/** In-window PIN overlay. Collect digits, then unmount before IsoDep starts. */
export function PinSheet({
  cap,
  title,
  lede,
  digits,
  error,
  busy,
  submitLabel,
  onDigit,
  onBackspace,
  onSubmit,
  onCancel,
}: {
  cap: string;
  title: string;
  lede: string;
  digits: string;
  error?: string;
  busy?: boolean;
  submitLabel: string;
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
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
        zIndex: 22,
        elevation: 22,
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
        <PinPad
          cap={cap}
          title={title}
          lede={lede}
          digits={digits}
          error={error}
          onDigit={onDigit}
          onBackspace={onBackspace}
        />
        <PrimaryButton
          label={busy ? "Hold still…" : submitLabel}
          disabled={busy || !pinReady(digits)}
          onPress={onSubmit}
        />
        <PrimaryButton label="Not now" tone="paper" disabled={busy} onPress={onCancel} />
      </View>
    </View>
  );
}
