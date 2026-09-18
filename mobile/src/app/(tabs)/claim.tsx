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
import { CardHoldWell, ClaimTicket } from "@/components/ClaimTicket";
import { Cap, H2, Lede, PrimaryButton, TextLink } from "@/components/ui";
import { useEstates } from "@/hooks/useEstates";
import type { EstateUiState } from "@/lib/estateState";
import type { EstateRow } from "@/lib/estates";
import { presentEstate } from "@/lib/presentEstate";
import { colors } from "@/theme";

function rank(state: EstateUiState): number {
  if (state === "claimable") return 0;
  if (state === "grace") return 1;
  if (state === "active") return 2;
  return 3;
}

function sortAsHeir(rows: EstateRow[]): EstateRow[] {
  return [...rows].sort((a, b) => {
    const sa = presentEstate(a.data, a.claimableLamports).state;
    const sb = presentEstate(b.data, b.claimableLamports).state;
    return rank(sa) - rank(sb);
  });
}

function onClaimPress(label: string, owner: string) {
  Alert.alert(
    `Claim ${label}?`,
    `From ${owner}. Assets move to this wallet. The vault then closes.`,
    [
      { text: "Not now", style: "cancel" },
      {
        text: "Claim inheritance",
        onPress: () =>
          Alert.alert("Coming next", "Claim writes land in the heir slice."),
      },
    ],
  );
}

function ClaimConnected({
  loading,
  error,
  ordered,
  readyCount,
  onHoldCard,
  onLookup,
}: {
  loading: boolean;
  error: string | null;
  ordered: EstateRow[];
  readyCount: number;
  onHoldCard: () => void;
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
          Looking for estates that name you…
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
          color: colors.claim,
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
            No estates yet
          </Text>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 14,
              lineHeight: 20,
              color: colors.mute,
            }}
          >
            This wallet is not named as heir on-chain. Try a card, or look up by
            the owner’s address.
          </Text>
        </View>
        <TextLink label="Look up by owner" align="left" onPress={onLookup} />
        <CardHoldWell onHold={onHoldCard} />
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
        <Cap>Named as heir</Cap>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_700Bold",
            fontSize: 11,
            letterSpacing: 1.4,
            color: colors.mute,
          }}
        >
          {readyCount === 0
            ? "None ready"
            : `${String(readyCount).padStart(2, "0")} ready`}
        </Text>
      </View>
      {ordered.map((row) => (
        <ClaimTicket key={row.address} row={row} onClaim={onClaimPress} />
      ))}
      <TextLink label="Look up by owner" align="left" onPress={onLookup} />
      <CardHoldWell onHold={onHoldCard} />
    </View>
  );
}


export default function ClaimScreen() {
  const { account, connect } = useMobileWallet();
  const { rows, loading, error } = useEstates("heir");
  const [busy, setBusy] = useState(false);
  const ordered = useMemo(() => sortAsHeir(rows), [rows]);
  const readyCount = ordered.filter(
    (row) => presentEstate(row.data, row.claimableLamports).state === "claimable",
  ).length;

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

  function onLookup() {
    Alert.alert("Coming next", "Owner lookup lands with the heir slice.");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <Cap>Claim inheritance</Cap>
        <H2>What was left for you</H2>
        <Lede>
          Estates that name this wallet as heir. Claim only when the window is
          open.
        </Lede>

        {!account ? (
          <View style={{ marginTop: 20, gap: 16 }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.ink,
                borderRadius: 12,
                backgroundColor: colors.yellow,
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
                Connect to see your name
              </Text>
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.ink,
                }}
              >
                We look up estates where this wallet is the heir. You do not
                need the owner’s address unless the scan misses one.
              </Text>
              <PrimaryButton
                label={busy ? "Working…" : "Connect wallet"}
                tone="ink"
                onPress={onConnect}
              />
            </View>
            <CardHoldWell onHold={onHoldCard} />
          </View>
        ) : (
          <ClaimConnected
            loading={loading}
            error={error}
            ordered={ordered}
            readyCount={readyCount}
            onHoldCard={onHoldCard}
            onLookup={onLookup}
          />
        )}
      </ScrollView>
    </View>
  );
}
