import { Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { Cap } from "@/components/ui";
import { colors, font, space } from "@/theme";
import type { HeirStep, HeirStepState } from "@/types/claim";

const DOT = 18;

function StepDot({ state }: { state: HeirStepState }) {
  return (
    <View
      style={{
        width: DOT,
        height: DOT,
        borderRadius: DOT / 2,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor:
          state === "done" ? colors.ink : state === "current" ? colors.yellow : colors.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {state === "done" ? <Icon name="check" size={10} weight={3.5} color={colors.yellow} /> : null}
    </View>
  );
}

/** "What happens next" for an heir: steps on a vertical line, the current one in yellow. */
export function HeirTimeline({ steps }: { steps: HeirStep[] }) {
  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ paddingBottom: 14 }}>
        <Cap>What happens next</Cap>
      </View>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <View key={step.title} style={{ flexDirection: "row", gap: 14 }}>
            <View style={{ alignItems: "center", width: 22 }}>
              <StepDot state={step.state} />
              {last ? null : (
                <View
                  style={{
                    flex: 1,
                    width: space.rule,
                    marginVertical: 4,
                    backgroundColor: step.state === "next" ? colors.quiet : colors.ink,
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1, gap: 4, paddingBottom: last ? 0 : 20 }}>
              <Text style={{ fontFamily: font.bold, fontSize: 16, color: colors.ink }}>
                {step.title}
              </Text>
              <Text
                style={{
                  fontFamily: font.regular,
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.mute,
                }}
              >
                {step.body}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
