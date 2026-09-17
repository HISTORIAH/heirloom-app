import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { EstateDetail } from "@/components/EstateDetail";
import { EstateRail } from "@/components/EstateRail";
import { EstateStrip } from "@/components/EstateStrip";
import { useEstates } from "@/hooks/useEstates";
import { colors } from "@/theme";

export default function DashboardScreen() {
  const router = useRouter();
  const { account, connect, disconnect } = useMobileWallet();
  const { rows, loading, error } = useEstates("authority");
  const [picked, setPicked] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (picked >= rows.length) setPicked(0);
  }, [picked, rows.length]);

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

  async function onDisconnect() {
    if (busy) return;
    setBusy(true);
    try {
      await disconnect();
    } catch (cause) {
      Alert.alert(
        "Wallet",
        cause instanceof Error ? cause.message : "Could not disconnect",
      );
    } finally {
      setBusy(false);
    }
  }

  function onNewEstate() {
    router.push("/create");
  }

  function onCheckIn() {
    Alert.alert("Coming next", "Check-in lands in the owner-write slice.");
  }

  const selected = rows[picked];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <EstateRail count={account ? rows.length : 0} onNewEstate={onNewEstate} />

      {!account ? (
        <EmptyState
          body="Connect your wallet to view your estates and manage your estates."
          primaryLabel={busy ? "Working…" : "Connect wallet"}
          onPrimary={onConnect}
          secondaryLabel="Were you named as an heir? Claim inheritance"
          onSecondary={() => router.push("/claim")}
        />
      ) : loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.ink} />
          <Text
            style={{
              marginTop: 12,
              fontFamily: "SpaceGrotesk_500Medium",
              color: colors.mute,
            }}
          >
            Looking on chain…
          </Text>
        </View>
      ) : error ? (
        <EmptyState
          title="Could not load"
          body={error}
          primaryLabel="Disconnect"
          onPrimary={onDisconnect}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No vault yet"
          body="Create your first estate to protect your assets for the future."
          primaryLabel="Create Your Estate"
          onPrimary={onNewEstate}
          secondaryLabel="Were you named as an heir? Claim inheritance"
          onSecondary={() => router.push("/claim")}
          tertiaryLabel="Disconnect wallet"
          onTertiary={onDisconnect}
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {rows.length > 1 ? (
            <EstateStrip rows={rows} selected={picked} onSelect={setPicked} />
          ) : null}
          {selected ? (
            <EstateDetail row={selected} onCheckIn={onCheckIn} />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
