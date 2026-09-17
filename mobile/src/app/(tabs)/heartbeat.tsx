import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { EstateGlanceList } from "@/components/EstateGlanceList";
import { Cap, H2, Lede, PrimaryButton, TextLink } from "@/components/ui";
import { useEstates } from "@/hooks/useEstates";
import { colors } from "@/theme";

function CardHoldBox() {
  return (
    <View
      style={{
        marginVertical: 20,
        padding: 20,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: colors.line,
        borderRadius: 12,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 220,
          aspectRatio: 1.586,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 10,
          backgroundColor: colors.bg,
          padding: 12,
        }}
      >
        <View
          style={{
            width: 22,
            height: 16,
            backgroundColor: colors.yellow,
            borderRadius: 2,
          }}
        />
        <View style={{ marginTop: 36 }}>
          <Cap>Heartbeat</Cap>
        </View>
      </View>
    </View>
  );
}

export default function HeartbeatScreen() {
  const { account, connect } = useMobileWallet();
  const { rows, loading, error } = useEstates("hbSigner");
  const [busy, setBusy] = useState(false);

  async function onConnect() {
    if (busy) return;
    setBusy(true);
    try {
      await connect();
    } catch (cause) {
      Alert.alert(
        "Wallet",
        cause instanceof Error ? cause.message : "Could not connect",
      );
    } finally {
      setBusy(false);
    }
  }

  function onHoldCard() {
    Alert.alert("Coming next", "Card heartbeat lands with the Java Card slice.");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
        <Cap>Send heartbeat</Cap>
        <H2>Keep the timer alive</H2>
        <Lede>Hold the signer card, or send from the owner wallet.</Lede>

        <CardHoldBox />

        <PrimaryButton label="Hold card" tone="sage" onPress={onHoldCard} />
        {!account ? (
          <TextLink
            label={busy ? "Working…" : "Connect wallet as signer"}
            onPress={onConnect}
          />
        ) : null}

        {account ? (
          <View style={{ marginTop: 40 }}>
            <Cap>Matched as signer</Cap>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 16 }} color={colors.ink} />
            ) : error ? (
              <Text
                style={{
                  marginTop: 12,
                  fontFamily: "SpaceGrotesk_500Medium",
                  color: colors.claim,
                }}
              >
                {error}
              </Text>
            ) : (
              <EstateGlanceList
                rows={rows}
                empty="No estates where this wallet is hb-signer."
              />
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
