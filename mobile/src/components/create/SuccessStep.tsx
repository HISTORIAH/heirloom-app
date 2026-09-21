import { Text, View } from "react-native";

import { Cap, PrimaryButton, TextLink } from "@/components/ui";
import { colors } from "@/theme";

export function SuccessStep({
  label,
  heirShort,
  totalDays,
  firstCheckIn,
  onDashboard,
  onAnother,
}: {
  label: string;
  heirShort: string;
  totalDays: number;
  firstCheckIn: string;
  onDashboard: () => void;
  onAnother: () => void;
}) {
  return (
    <View style={{ paddingTop: 32, alignItems: "center" }}>
      <Cap>Confirmed</Cap>
      <Text
        style={{
          width: "100%",
          textAlign: "center",
          fontFamily: "SpaceGrotesk_600SemiBold",
          fontSize: 34,
          letterSpacing: 34 * -0.035,
          lineHeight: 38,
          color: colors.ink,
          marginVertical: 8,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          marginTop: 8,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 16,
          lineHeight: 24,
          color: colors.mute,
          textAlign: "center",
        }}
      >
        {`${heirShort} inherits everything if you go quiet for ${totalDays} days. First check-in due ${firstCheckIn}.`}
      </Text>
      <View style={{ marginTop: 28, width: "100%" }}>
        <PrimaryButton label="Go to dashboard" onPress={onDashboard} />
        <TextLink label="Create another" onPress={onAnother} />
      </View>
    </View>
  );
}
