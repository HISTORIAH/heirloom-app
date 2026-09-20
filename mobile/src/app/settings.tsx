import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { Cap, H2, Lede, PrimaryButton, TextLink, Tile } from "@/components/ui";
import { clusterLabel } from "@/config";
import { colors } from "@/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { account, disconnect } = useMobileWallet();
  const [busy, setBusy] = useState(false);

  async function onDisconnect() {
    if (busy) return;
    setBusy(true);
    try {
      await disconnect();
      router.replace("/");
    } catch (cause) {
      Alert.alert(
        "Wallet",
        cause instanceof Error ? cause.message : "Could not disconnect",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader back />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110, gap: 16 }}>
        <Cap>Settings</Cap>
        <H2>This device</H2>
        <Tile paper>
          <Cap>Cluster</Cap>
          <View style={{ marginTop: 8 }}>
            <H2 size={28}>{clusterLabel()}</H2>
          </View>
          <Lede>Locale and a second tour wait on a later slice.</Lede>
        </Tile>
        {account ? (
          <PrimaryButton
            label={busy ? "Working…" : "Disconnect wallet"}
            tone="ink"
            disabled={busy}
            onPress={() => void onDisconnect()}
          />
        ) : (
          <TextLink label="Back to dashboard" onPress={() => router.replace("/")} />
        )}
      </ScrollView>
    </View>
  );
}
