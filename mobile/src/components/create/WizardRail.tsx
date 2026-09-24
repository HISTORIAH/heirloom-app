import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme";

const NAMES = ["HEIRS", "ASSETS", "HEARTBEAT", "REVIEW"] as const;

export function WizardRail({
  step,
  farthest,
  complete,
  frozen,
  onJump,
}: {
  step: number;
  farthest: number;
  complete?: boolean;
  frozen?: boolean;
  onJump: (n: number) => void;
}) {
  const name = complete ? "COMPLETE" : NAMES[step - 1];
  const shown = complete ? 4 : step;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 48,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        backgroundColor: colors.bg,
      }}
    >
      <Text
        style={{
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 11,
          letterSpacing: 1.98,
          textTransform: "uppercase",
          color: colors.ink,
        }}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text
        style={{
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 11,
          letterSpacing: 1.98,
          color: colors.mute,
        }}
      >
        {`${String(shown).padStart(2, "0")} / 04`}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[1, 2, 3, 4].map((i) => {
          const current = !complete && i === step;
          const reached = complete || i <= farthest;
          const tappable = !complete && !frozen && reached && i !== step;
          return (
            <Pressable
              key={i}
              onPress={() => {
                if (tappable) onJump(i);
              }}
              disabled={!tappable}
              accessibilityRole="button"
              accessibilityState={{ selected: current, disabled: !tappable }}
              accessibilityLabel={`Step ${i}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: current ? colors.ink : colors.line,
                backgroundColor: current ? colors.ink : colors.bg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_700Bold",
                  fontSize: 11,
                  color: current ? colors.white : reached ? colors.ink : colors.mute,
                }}
              >
                {String(i).padStart(2, "0")}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
