import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { EstateDetail } from "@/components/EstateDetail";
import { EstatePicker } from "@/components/EstatePicker";
import { EstateRail } from "@/components/EstateRail";
import { useEstates } from "@/hooks/useEstates";
import { useOwnerTx } from "@/hooks/useOwnerTx";
import { openExplorerTx } from "@/lib/explorer";
import { colors } from "@/theme";
import type { Address } from "@solana/kit";

export default function DashboardScreen() {
  const router = useRouter();
  const { account, connect, disconnect, client } = useMobileWallet();
  const { rows, loading, error, reload } = useEstates("authority");
  const { checkIn, topUpSol, reassignHeir, closeEstate, updateSettings, addToken } =
    useOwnerTx();
  const [picked, setPicked] = useState(0);
  const [busy, setBusy] = useState(false);
  const detailOpacity = useSharedValue(1);
  const skipDetailFade = useRef(true);

  useEffect(() => {
    if (picked >= rows.length) setPicked(0);
  }, [picked, rows.length]);

  useEffect(() => {
    if (skipDetailFade.current) {
      skipDetailFade.current = false;
      return;
    }
    detailOpacity.value = 0.4;
    detailOpacity.value = withTiming(1, { duration: 220 });
  }, [picked, detailOpacity]);

  const detailFade = useAnimatedStyle(() => ({
    opacity: detailOpacity.value,
  }));

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

  function onScan() {
    router.push("/scan");
  }

  const selected = rows[picked];

  async function runOwner(
    title: string,
    work: () => Promise<string>,
    okTitle: string,
    okBody: string,
    resetPick?: boolean,
  ) {
    if (busy) return;
    setBusy(true);
    try {
      const sig = await work();
      if (resetPick) setPicked(0);
      reload();
      Alert.alert(okTitle, okBody, [
        { text: "OK" },
        { text: "View on explorer", onPress: () => openExplorerTx(sig) },
      ]);
    } catch (cause) {
      Alert.alert(
        title,
        cause instanceof Error ? cause.message : "Something went wrong",
      );
    } finally {
      setBusy(false);
    }
  }

  function onCheckIn() {
    const row = selected;
    if (!row || busy) return;
    Alert.alert("Check in?", "Restarts your check-in timer. Nothing else moves.", [
      { text: "Not now", style: "cancel" },
      {
        text: "Check in",
        onPress: () =>
          void runOwner(
            "Check-in",
            () => checkIn(row.data.heir),
            "Checked in",
            "The timer starts again.",
          ),
      },
    ]);
  }

  function onAddSol(lamports: bigint) {
    const row = selected;
    if (!row || busy) return;
    Alert.alert(
      "Add SOL?",
      "This SOL locks in the vault until claim or withdraw.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Add SOL",
          onPress: () =>
            void runOwner(
              "Top up",
              () => topUpSol(row.data.heir, lamports),
              "SOL added",
              "It is locked in the vault.",
            ),
        },
      ],
    );
  }

  function onReassign(newHeir: Address) {
    const row = selected;
    if (!row || busy) return;
    Alert.alert(
      "Change heir?",
      "The vault moves to a new estate. The check-in signer stays the same.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Change heir",
          onPress: () =>
            void runOwner(
              "Change heir",
              () => reassignHeir(row, newHeir),
              "Heir changed",
              "Assets now sit on the new estate.",
              true,
            ),
        },
      ],
    );
  }

  function onTiming(fields: {
    heartbeatInterval?: bigint;
    gracePeriod?: bigint;
    pauseDuration?: bigint;
    label?: string;
  }) {
    const row = selected;
    if (!row || busy) return;
    Alert.alert(
      "Save timing?",
      "This also counts as a check-in and pushes the claim window forward. Check-in, grace, pause length, and label change on-chain.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Save",
          onPress: () =>
            void runOwner(
              "Update timing",
              () => updateSettings(row, fields),
              "Timing saved",
              "This estate uses the new settings.",
            ),
        },
      ],
    );
  }

  function onAddAsset(mint: Address, amount: bigint) {
    const row = selected;
    if (!row || busy) return;
    Alert.alert(
      "Add token?",
      "This registers a new mint. The amount leaves your wallet and locks in the vault. It is not a top-up of an existing token.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Add token",
          onPress: () =>
            void runOwner(
              "Add asset",
              () => addToken(row, mint, amount),
              "Token added",
              "It is registered as a claimable asset.",
            ),
        },
      ],
    );
  }

  function onCloseEstate() {
    const row = selected;
    if (!row || busy) return;
    Alert.alert(
      "Close this estate?",
      "Assets return to you. 0.5% is taken from the vault. The heir can no longer claim. This cannot be undone.",
      [
        { text: "Keep estate", style: "cancel" },
        {
          text: "Close estate",
          style: "destructive",
          onPress: () =>
            void runOwner(
              "Close estate",
              () => closeEstate(row),
              "Estate closed",
              "Assets are back in this wallet.",
              true,
            ),
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <EstateRail count={account ? rows.length : 0} onScan={onScan} />

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
            <EstatePicker rows={rows} selected={picked} onSelect={setPicked} />
          ) : null}
          {selected ? (
            <Animated.View style={detailFade}>
              <EstateDetail
                row={selected}
                rpc={client.rpc}
                onCheckIn={onCheckIn}
                onAddSol={onAddSol}
                onReassign={onReassign}
                onTiming={onTiming}
                onAddAsset={onAddAsset}
                onCloseEstate={onCloseEstate}
                adding={busy}
              />
            </Animated.View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
