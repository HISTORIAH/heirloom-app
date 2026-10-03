import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Cap, Display, IconButton } from "@/components/ui";
import { colors, font, space } from "@/theme";

const STEPS = 4;

/** Close, four-segment progress, and "n/4". Tap a completed step to jump back to it. */
export function WizardTop({
  step,
  onClose,
  onStep,
}: {
  step: number;
  onClose: () => void;
  onStep?: (step: number) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 12,
        paddingHorizontal: space.pad,
        paddingBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      <IconButton icon="close" label="Close and discard" onPress={onClose} />
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${step} of ${STEPS}`}
        accessibilityValue={{ min: 1, max: STEPS, now: step }}
        style={{ flex: 1, flexDirection: "row", gap: 6 }}
      >
        {Array.from({ length: STEPS }, (_, i) =>
          onStep !== undefined && i + 1 < step ? (
            <Pressable
              key={i}
              onPress={() => onStep(i + 1)}
              accessibilityRole="button"
              accessibilityLabel={`Go back to step ${i + 1}`}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.ink,
                }}
              />
            </Pressable>
          ) : (
            <View
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: i < step ? colors.ink : colors.line,
              }}
            />
          ),
        )}
      </View>
      <Text
        style={{
          fontFamily: font.bold,
          fontSize: 13,
          fontVariant: ["tabular-nums"],
          color: colors.ink,
        }}
      >
        {step}/{STEPS}
      </Text>
    </View>
  );
}

/** Step eyebrow and question. */
export function StepHead({ eyebrow, title }: { eyebrow: string; title?: string }) {
  return (
    <View style={{ gap: 12 }}>
      <Cap>{eyebrow}</Cap>
      {title !== undefined ? <Display size={30}>{title}</Display> : null}
    </View>
  );
}

/** Sticky bottom area for the step's call to action. */
export function WizardFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingHorizontal: space.pad,
        paddingTop: 16,
        paddingBottom: Math.max(insets.bottom, 16) + 12,
        gap: 12,
        borderTopWidth: space.rule,
        borderTopColor: colors.ink,
        backgroundColor: colors.bg,
      }}
    >
      {children}
    </View>
  );
}

/** Red line under a field or above the CTA. */
export function ErrorLine({ children }: { children?: string }) {
  if (children === undefined) return null;
  return (
    <Text style={{ fontFamily: font.semibold, fontSize: 13, lineHeight: 18, color: colors.claim }}>
      {children}
    </Text>
  );
}
