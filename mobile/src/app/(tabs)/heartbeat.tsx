import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { PulseTicket, SignerHoldWell } from "@/components/PulseTicket";
import { Cap, H2, Lede, PrimaryButton, TextLink } from "@/components/ui";
import { useEstates } from "@/hooks/useEstates";
import type { EstateUiState } from "@/lib/estateState";
import type { EstateRow } from "@/lib/estates";
import { presentEstate } from "@/lib/presentEstate";
import { colors } from "@/theme";

function rank(state: EstateUiState): number {
  if (state === "grace") return 0;
  if (state === "claimable") return 1;
  if (state === "active") return 2;
  return 3;
}

function sortAsSigner(rows: EstateRow[]): EstateRow[] {
  return [...rows].sort((a, b) => {
    const sa = presentEstate(a.data, a.claimableLamports).state;
    const sb = presentEstate(b.data, b.claimableLamports).state;
    return rank(sa) - rank(sb);
  });
}

function onBeatPress(label: string, reclaim: boolean) {
  Alert.alert(
    reclaim ? `Reclaim ${label}?` : `Send a heartbeat for ${label}?`,
    "This only resets the timer. It cannot move assets.",
    [
      { text: "Not now", style: "cancel" },
      {
        text: reclaim ? "I'm alive — reclaim" : "Send heartbeat",
        onPress: () =>
          Alert.alert(
            "Coming next",
            "Signer check-in lands in the heir / signer write slice.",
          ),
      },
    ],
  );
}

function HeartbeatConnected({
  loading,
  error,
  ordered,
  dueCount,
  onHold,
  onLookup,
}: {
  loading: boolean;
  error: string | null;
  ordered: EstateRow[];
  dueCount: number;
  onHold: () => void;
  onLookup: () => void;
}) {
  if (loading) {
    return (
      <View style={{ marginTop: 32, alignItems: "center" }}>
        <ActivityIndicator color={colors.ink} />
        <Text
          style={{
            marginTop: 12,
            fontFamily: "SpaceGrotesk_500Medium",
            color: colors.mute,
          }}
        >
          Looking for estates you sign for…
        </Text>
      </View>
    );
  }

  if (error !== null) {
    return (
      <Text
        style={{
          marginTop: 20,
          fontFamily: "SpaceGrotesk_500Medium",
          color: colors.mute,
        }}
      >
        {error}
      </Text>
    );
  }

  if (ordered.length === 0) {
    return (
      <View style={{ marginTop: 20, gap: 16 }}>
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 12,
            backgroundColor: colors.soft,
            padding: 16,
            gap: 8,
          }}
        >
          <Text
            style={{
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 18,
              color: colors.ink,
            }}
          >
            No signer role
          </Text>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 14,
              lineHeight: 20,
              color: colors.mute,
            }}
          >
            This wallet is not the heartbeat signer on any estate. Hold the
            signer card, or look up by owner and heir.
          </Text>
        </View>
        <TextLink
          label="Look up by owner and heir"
          align="left"
          onPress={onLookup}
        />
        <SignerHoldWell onHold={onHold} />
      </View>
    );
  }

  return (
    <View style={{ marginTop: 20, gap: 14 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <Cap>You keep time</Cap>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_700Bold",
            fontSize: 11,
            letterSpacing: 1.4,
            color: colors.mute,
          }}
        >
          {dueCount === 0
            ? "All on time"
            : `${String(dueCount).padStart(2, "0")} due`}
        </Text>
      </View>
      {ordered.map((row) => (
        <PulseTicket key={row.address} row={row} onBeat={onBeatPress} />
      ))}
      <TextLink
        label="Look up by owner and heir"
        align="left"
        onPress={onLookup}
      />
      <SignerHoldWell onHold={onHold} />
    </View>
  );
}

export default function HeartbeatScreen() {
  const { account, connect } = useMobileWallet();
  const { rows, loading, error } = useEstates("hbSigner");
  const [busy, setBusy] = useState(false);
  const ordered = useMemo(() => sortAsSigner(rows), [rows]);
  const dueCount = ordered.filter((row) => {
    const state = presentEstate(row.data, row.claimableLamports).state;
    return state === "grace" || state === "claimable";
  }).length;

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

  function onHold() {
    Alert.alert(
      "Coming next",
      "Card heartbeat lands with the Java Card slice.",
    );
  }

  function onLookup() {
    Alert.alert(
      "Coming next",
      "Owner + heir lookup lands with the signer write slice.",
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <Cap>Send heartbeat</Cap>
        <H2>Keep the timer alive</H2>
        <Lede>
          You can bump the clock. You cannot move the vault. Grace estates come
          first.
        </Lede>

        {!account ? (
          <View style={{ marginTop: 20, gap: 16 }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.ink,
                borderRadius: 12,
                backgroundColor: colors.sage,
                padding: 18,
                gap: 10,
              }}
            >
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_600SemiBold",
                  fontSize: 22,
                  letterSpacing: -0.4,
                  color: colors.ink,
                }}
              >
                Connect to keep time
              </Text>
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.ink,
                }}
              >
                We find estates where this wallet is the heartbeat signer. The
                key on a signer card is the same job.
              </Text>
              <PrimaryButton
                label={busy ? "Working…" : "Connect wallet"}
                tone="ink"
                onPress={onConnect}
              />
            </View>
            <SignerHoldWell onHold={onHold} />
          </View>
        ) : (
          <HeartbeatConnected
            loading={loading}
            error={error}
            ordered={ordered}
            dueCount={dueCount}
            onHold={onHold}
            onLookup={onLookup}
          />
        )}
      </ScrollView>
    </View>
  );
}
