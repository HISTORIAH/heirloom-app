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
import { Cap, H2, Lede, PrimaryButton, TextLink, Tile } from "@/components/ui";
import { useEstates } from "@/hooks/useEstates";
import { colors } from "@/theme";

export default function ClaimScreen() {
  const { account, connect } = useMobileWallet();
  const { rows, loading, error } = useEstates("heir");
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
    Alert.alert("Coming next", "Card claim lands with the Java Card slice.");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
        <Cap>Claim inheritance</Cap>
        <H2>Find your estate</H2>
        <Lede>
          Look up by owner, or hold the card you were given. Connect only when you
          claim.
        </Lede>

        <View style={{ marginTop: 16 }}>
          <Tile paper>
            <Cap>Look up</Cap>
            <Text
              style={{
                marginTop: 8,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 14,
                color: colors.ink,
              }}
            >
              Owner address (optional)
            </Text>
          </Tile>
        </View>

        <View style={{ marginTop: 16 }}>
          <PrimaryButton label="I have a card. Hold to claim" onPress={onHoldCard} />
          {!account ? (
            <TextLink
              label={busy ? "Working…" : "Connect wallet to scan as heir"}
              onPress={onConnect}
            />
          ) : null}
        </View>

        {account ? (
          <View style={{ marginTop: 40 }}>
            <Cap>Matched as heir</Cap>
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
                empty="No estates where this wallet is heir."
              />
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
