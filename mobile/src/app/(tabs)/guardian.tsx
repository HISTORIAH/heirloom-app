import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  View,
} from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { ChainLoading } from "@/components/ChainLoading";
import { gateKind, LatchRail, PauseGate } from "@/components/PauseGate";
import { Cap, H2, Lede, PrimaryButton, TextLink } from "@/components/ui";
import { useEstates } from "@/hooks/useEstates";
import type { EstateRow } from "@/lib/estates";
import { presentEstate } from "@/lib/presentEstate";
import { colors } from "@/theme";

function rank(row: EstateRow): number {
  const kind = gateKind(row);
  if (kind === "holdable") {
    const state = presentEstate(row.data, row.claimableLamports).state;
    return state === "grace" ? 0 : 1;
  }
  if (kind === "holding") return 2;
  if (kind === "unset") return 3;
  if (kind === "spent") return 4;
  if (kind === "late") return 5;
  return 6;
}

function sortAsGuardian(rows: EstateRow[]): EstateRow[] {
  return [...rows].sort((a, b) => rank(a) - rank(b));
}

function onDeferPress(label: string, duration: string) {
  Alert.alert(
    `Hold ${label}?`,
    `Pushes the claim window by ${duration}. Once until a heartbeat clears it.`,
    [
      { text: "Not now", style: "cancel" },
      {
        text: "Hold the window",
        onPress: () =>
          Alert.alert(
            "Coming next",
            "Mobile defer waits on a web linking pass, then the guardian slice.",
          ),
      },
    ],
  );
}

function GuardianConnected({
  loading,
  error,
  ordered,
  holdableCount,
  onLookup,
}: {
  loading: boolean;
  error: string | null;
  ordered: EstateRow[];
  holdableCount: number;
  onLookup: () => void;
}) {
  if (loading) {
    return <ChainLoading compact body="Looking for estates you guard…" />;
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
            gap: 12,
          }}
        >
          <LatchRail kind="ended" />
          <Text
            style={{
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 18,
              color: colors.ink,
            }}
          >
            No guardian role
          </Text>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 14,
              lineHeight: 20,
              color: colors.mute,
            }}
          >
            This wallet is not named as guardian on any estate. Look up by owner
            and heir if you were assigned off this device.
          </Text>
        </View>
        <TextLink
          label="Look up by owner and heir"
          align="left"
          onPress={onLookup}
        />
        <Text
          style={{
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 13,
            lineHeight: 18,
            color: colors.mute,
          }}
        >
          There is no guardian card. This wallet is the only key.
        </Text>
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
        <Cap>You hold the gate</Cap>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_700Bold",
            fontSize: 11,
            letterSpacing: 1.4,
            color: colors.mute,
          }}
        >
          {holdableCount === 0
            ? "None open"
            : `${String(holdableCount).padStart(2, "0")} can hold`}
        </Text>
      </View>
      {ordered.map((row) => (
        <PauseGate key={row.address} row={row} onDefer={onDeferPress} />
      ))}
      <TextLink
        label="Look up by owner and heir"
        align="left"
        onPress={onLookup}
      />
      <Text
        style={{
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 13,
          lineHeight: 18,
          color: colors.mute,
        }}
      >
        There is no guardian card. This wallet is the only key.
      </Text>
    </View>
  );
}

export default function GuardianScreen() {
  const { account, connect } = useMobileWallet();
  const { rows, loading, error } = useEstates("delegate");
  const [busy, setBusy] = useState(false);
  const ordered = useMemo(() => sortAsGuardian(rows), [rows]);
  const holdableCount = ordered.filter((row) => gateKind(row) === "holdable").length;

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

  function onLookup() {
    Alert.alert(
      "Coming next",
      "Owner + heir lookup lands with the guardian slice.",
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <Cap>Guardian</Cap>
        <H2>Hold the claim window</H2>
        <Lede>
          One pause, for the length the owner set. You cannot claim and you
          cannot check in.
        </Lede>

        {!account ? (
          <View style={{ marginTop: 20, gap: 16 }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.ink,
                borderRadius: 12,
                backgroundColor: colors.soft,
                padding: 18,
                gap: 14,
              }}
            >
              <LatchRail kind="holdable" />
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_600SemiBold",
                  fontSize: 22,
                  letterSpacing: -0.4,
                  color: colors.ink,
                }}
              >
                Connect to hold a window
              </Text>
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.ink,
                }}
              >
                We find estates where this wallet is the guardian. There is no
                card for this role.
              </Text>
              <PrimaryButton
                label={busy ? "Working…" : "Connect wallet"}
                tone="ink"
                onPress={onConnect}
              />
            </View>
          </View>
        ) : (
          <GuardianConnected
            loading={loading}
            error={error}
            ordered={ordered}
            holdableCount={holdableCount}
            onLookup={onLookup}
          />
        )}
      </ScrollView>
    </View>
  );
}
