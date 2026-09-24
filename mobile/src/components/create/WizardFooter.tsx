import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/ui";
import { colors } from "@/theme";

/** PillTabBar wrapper: 62 bar + 32 FAB overhang + inset + 12 gap above the circle. */
export function createFabSpacer(insetBottom: number): number {
  return 62 + 32 + Math.max(insetBottom, 10) + 12;
}

export function WizardFooter({
  step,
  skipAssets,
  busy,
  createReady,
  reason,
  continueDimmed,
  amountBlocked,
  timingBlocked,
  onBack,
  onPrimary,
}: {
  step: number;
  skipAssets: boolean;
  busy: boolean;
  createReady: boolean;
  reason?: string;
  continueDimmed?: boolean;
  amountBlocked?: boolean;
  timingBlocked?: boolean;
  onBack: () => void;
  onPrimary: () => void;
}) {
  const primary = primaryLabel(step, skipAssets, busy);
  const createLocked = step === 4 && (!createReady || busy);
  const locked =
    createLocked || amountBlocked === true || timingBlocked === true;

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderTopWidth: 1,
        borderTopColor: colors.line,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 12,
        gap: 8,
      }}
    >
      {reason ? (
        <Text
          style={{
            fontFamily: "SpaceGrotesk_700Bold",
            fontSize: 11,
            letterSpacing: 1.98,
            textTransform: "uppercase",
            color: colors.mute,
          }}
        >
          {reason}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          {step > 1 ? (
            <PrimaryButton label="Back" tone="sage" onPress={onBack} />
          ) : (
            <View style={{ height: 1 }} />
          )}
        </View>
        <View style={{ flex: 1, opacity: continueDimmed && !locked ? 0.45 : 1 }}>
          <PrimaryButton
            label={primary}
            disabled={locked}
            onPress={onPrimary}
          />
        </View>
      </View>
    </View>
  );
}

export function FabClearance() {
  const insets = useSafeAreaInsets();
  return <View style={{ height: createFabSpacer(insets.bottom) }} />;
}

function primaryLabel(step: number, skipAssets: boolean, busy: boolean): string {
  if (step === 4) return busy ? "Working…" : "Create estate";
  if (step === 2 && skipAssets) return "Skip for now";
  return "Continue";
}
