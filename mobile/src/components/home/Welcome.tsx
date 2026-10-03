import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckInBars } from "@/components/CheckInBars";
import { Icon } from "@/components/Icon";
import { Wordmark } from "@/components/Wordmark";
import { PrimaryButton, TextLink } from "@/components/ui";
import { colors, font, space } from "@/theme";

function Caps({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: font.medium, fontSize: 11, letterSpacing: 1.1, color: colors.mute }}>
      {children}
    </Text>
  );
}

/**
 * A sample of what Home will show. It takes whatever height the phone leaves,
 * so a tall screen gets a bigger picture instead of a gap above the buttons.
 */
function Preview() {
  return (
    <View
      accessible
      accessibilityLabel="Example: check in every 90 days. If you stop, your heir can claim after a 30-day wait."
      style={{
        flexGrow: 1,
        minHeight: 150,
        maxHeight: 340,
        borderWidth: space.rule,
        borderColor: colors.ink,
        borderRadius: space.radiusHero,
        backgroundColor: colors.paper,
        padding: 18,
        gap: 12,
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Caps>YOU CHECK IN</Caps>
        <Caps>GRACE</Caps>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        <Text
          style={{
            fontFamily: font.semibold,
            fontSize: 72,
            lineHeight: 76,
            letterSpacing: -3,
            fontVariant: ["tabular-nums"],
            color: colors.ink,
          }}
        >
          90
        </Text>
        <Text
          style={{
            flex: 1,
            paddingBottom: 10,
            fontFamily: font.bold,
            fontSize: 17,
            lineHeight: 21,
            color: colors.ink,
          }}
        >
          days between{"\n"}check-ins
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        <CheckInBars intervalDays={90} graceDays={30} height={40} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.ink }}>Today</Text>
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.ink }}>
            Heir can claim
          </Text>
        </View>
      </View>
    </View>
  );
}

function CredentialEntry({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: space.radiusTile,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: colors.paper,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="tap" size={24} color={colors.bg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 16, color: colors.ink }}>
          I have a Heirloom credential
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 14, color: colors.mute }}>
          Card, ring or band. No wallet needed.
        </Text>
      </View>
      <Icon name="chevronRight" />
    </Pressable>
  );
}

/** Not connected: connect a wallet, or tap a credential with no wallet at all. */
export function Welcome({ busy, onConnect }: { busy: boolean; onConnect: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 8,
        paddingHorizontal: space.pad,
        paddingBottom: Math.max(insets.bottom, 16) + 12,
        gap: 20,
      }}
    >
      <View style={{ marginLeft: -14 }}>
        <Wordmark height={40} />
      </View>

      <Text
        accessibilityRole="header"
        style={{
          fontFamily: font.bold,
          fontSize: 44,
          lineHeight: 45,
          letterSpacing: -1.54,
          color: colors.ink,
        }}
      >
        Your crypto reaches the right person.
      </Text>
      <Text style={{ fontFamily: font.regular, fontSize: 17, lineHeight: 25, color: colors.mute }}>
        Self-custodial inheritance on Solana. Check in now and then. If you stop, your heir can
        claim.
      </Text>

      <Preview />

      <View style={{ gap: 10 }}>
        <PrimaryButton
          label={busy ? "Opening wallet…" : "Connect wallet"}
          disabled={busy}
          onPress={onConnect}
        />
        <Text
          style={{
            textAlign: "center",
            fontFamily: font.regular,
            fontSize: 12,
            color: colors.mute,
          }}
        >
          Your keys never leave your wallet
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 6 }}>
          <View style={{ flex: 1, height: space.rule, backgroundColor: colors.line }} />
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.mute }}>OR</Text>
          <View style={{ flex: 1, height: space.rule, backgroundColor: colors.line }} />
        </View>
        <CredentialEntry onPress={() => router.push("/tap")} />
        <TextLink
          flush
          label="Look up an estate by owner address"
          onPress={() => router.push("/lookup")}
        />
      </View>
    </ScrollView>
  );
}
