import { useRouter } from "expo-router";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckInBars } from "@/components/CheckInBars";
import { Wordmark } from "@/components/Wordmark";
import { PrimaryButton, TextLink } from "@/components/ui";
import { DEFAULT_CHECK_IN_DAYS, DEFAULT_GRACE_DAYS } from "@/constants/estate";
import { colors, font, space } from "@/theme";

/** The check-in ruler with nothing around it: what Home will show, in one line. */
function TickStrip() {
  return (
    <View
      accessible
      accessibilityLabel="You check in now and then. If you stop, your heir can claim."
      style={{ gap: 8 }}
    >
      <CheckInBars
        intervalDays={DEFAULT_CHECK_IN_DAYS}
        graceDays={DEFAULT_GRACE_DAYS}
        height={34}
      />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: font.bold, fontSize: 12, color: colors.mute }}>
          You check in
        </Text>
        <Text style={{ fontFamily: font.bold, fontSize: 12, color: colors.mute }}>
          Heir can claim
        </Text>
      </View>
    </View>
  );
}

/** Not connected: connect a wallet, or tap a credential with no wallet at all. */
export function Welcome({ busy, onConnect }: { busy: boolean; onConnect: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Tall phones get a bigger headline rather than a bigger gap above the buttons.
  const headline = height >= 800 ? 52 : 44;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 8,
        paddingHorizontal: space.pad,
        paddingBottom: Math.max(insets.bottom, 16) + 12,
      }}
    >
      <View style={{ marginLeft: -14 }}>
        <Wordmark height={40} />
      </View>

      <View style={{ marginTop: 40 }}>
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: font.bold,
            fontSize: headline,
            lineHeight: Math.round(headline * 1.03),
            letterSpacing: headline * -0.035,
            color: colors.ink,
          }}
        >
          Your crypto reaches the right person.
        </Text>
        <Text
          style={{
            marginTop: 20,
            fontFamily: font.regular,
            fontSize: 17,
            lineHeight: 25,
            color: colors.mute,
          }}
        >
          Check in now and then. If you stop, your heir can claim. You keep your keys the whole
          time.
        </Text>

        <View style={{ marginTop: 36 }}>
          <TickStrip />
        </View>
      </View>

      {/* Takes whatever height is left, so the actions sit at the bottom on any phone. */}
      <View style={{ flexGrow: 1, minHeight: 32 }} />

      <View style={{ gap: 12 }}>
        <PrimaryButton
          label={busy ? "Opening wallet…" : "Connect wallet"}
          disabled={busy}
          onPress={onConnect}
        />
        <PrimaryButton
          tone="outline"
          icon="tap"
          label="I have an Heirloom credential"
          onPress={() => router.push("/tap")}
        />
        <TextLink
          flush
          quiet
          label="Look up an estate by owner address"
          onPress={() => router.push("/lookup")}
        />
      </View>
    </ScrollView>
  );
}
