import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { ConfirmSheet, useConfirmSheet } from "@/components/ConfirmSheet";
import { QuietRow, SectionLabel } from "@/components/Quiet";
import { clusterLabel } from "@/config";
import { colors } from "@/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { account, disconnect } = useMobileWallet();
  const [busy, setBusy] = useState(false);
  const { ask, fail, cancel, confirm, extra } = useConfirmSheet();

  async function onDisconnect() {
    if (busy) return;
    setBusy(true);
    try {
      await disconnect();
      router.replace("/");
    } catch (cause) {
      fail("Wallet", cause);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader back />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 30, paddingBottom: 110 }}>
        <SectionLabel title="This device" />
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
          <QuietRow title="Cluster" desc={clusterLabel()} />
          <QuietRow title="Locale" desc="English for now" />
          {account ? (
            <QuietRow
              title={busy ? "Working…" : "Disconnect wallet"}
              onPress={() => void onDisconnect()}
            />
          ) : (
            <QuietRow title="Back to dashboard" onPress={() => router.replace("/")} />
          )}
        </View>
      </ScrollView>
      <ConfirmSheet ask={ask} onCancel={cancel} onConfirm={confirm} onExtra={extra} />
    </View>
  );
}
