import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { AddressLookup } from "@/components/AddressLookup";
import { AppHeader } from "@/components/AppHeader";
import { ChainLoading } from "@/components/ChainLoading";
import { CardHoldWell, ClaimTicket } from "@/components/ClaimTicket";
import { ConfirmSheet, useConfirmSheet } from "@/components/ConfirmSheet";
import { Cap, H2, Lede, PrimaryButton, TextLink } from "@/components/ui";
import { useEstates } from "@/hooks/useEstates";
import { useHeirTx } from "@/hooks/useHeirTx";
import type { EstateUiState } from "@/lib/estateState";
import { fetchEstateByPair, type EstateRow } from "@/lib/estates";
import { openExplorerTx } from "@/lib/explorer";
import { parseAddress } from "@/lib/ownerWrites";
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

function mergeRows(discovered: EstateRow[], extra: EstateRow[]): EstateRow[] {
  const byAddr = new Map<string, EstateRow>();
  for (const row of extra) byAddr.set(row.address, row);
  for (const row of discovered) byAddr.set(row.address, row);
  return [...byAddr.values()];
}

function fail(title: string, cause: unknown) {
  Alert.alert(
    title,
    cause instanceof Error ? cause.message : "Something went wrong",
  );
}

function ClaimConnected({
  loading,
  error,
  ordered,
  readyCount,
  busy,
  showLookup,
  ownerQuery,
  setOwnerQuery,
  onClaim,
  onHoldCard,
  onToggleLookup,
  onLookup,
}: {
  loading: boolean;
  error: string | null;
  ordered: EstateRow[];
  readyCount: number;
  busy: boolean;
  showLookup: boolean;
  ownerQuery: string;
  setOwnerQuery: (value: string) => void;
  onClaim: (row: EstateRow) => void;
  onHoldCard: () => void;
  onToggleLookup: () => void;
  onLookup: () => void;
}) {
  const lookup = (
    <View style={{ gap: 12 }}>
      <TextLink
        label={showLookup ? "Hide owner lookup" : "Look up by owner"}
        align="left"
        onPress={onToggleLookup}
      />
      {showLookup ? (
        <AddressLookup
          fields={[
            {
              key: "owner",
              label: "Owner",
              value: ownerQuery,
              onChange: setOwnerQuery,
            },
          ]}
          submitLabel="Find estate"
          busy={busy}
          onSubmit={onLookup}
        />
      ) : null}
      <CardHoldWell onHold={onHoldCard} />
    </View>
  );

  if (loading) {
    return <ChainLoading compact body="Looking for estates that name you…" />;
  }

  if (error !== null) {
    return (
      <View style={{ marginTop: 20, gap: 16 }}>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_500Medium",
            color: colors.claim,
          }}
        >
          {error}
        </Text>
        {lookup}
      </View>
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
            This wallet is not named as heir on-chain. Look up by the owner’s
            address, or wait for card tap.
          </Text>
        </View>
        {lookup}
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
        <ClaimTicket
          key={row.address}
          row={row}
          busy={busy}
          onClaim={onClaim}
        />
      ))}
      {lookup}
    </View>
  );
}

export default function ClaimScreen() {
  const { account, client, connect } = useMobileWallet();
  const { rows, loading, error, reload } = useEstates("heir");
  const { claimAll } = useHeirTx();
  const [busy, setBusy] = useState(false);
  const [showLookup, setShowLookup] = useState(false);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [extra, setExtra] = useState<EstateRow[]>([]);
  const { ask, prompt, cancel, confirm } = useConfirmSheet();
  const ordered = useMemo(
    () => sortAsHeir(mergeRows(rows, extra)),
    [rows, extra],
  );
  const readyCount = ordered.filter(
    (row) => presentEstate(row.data, row.claimableLamports).state === "claimable",
  ).length;

  async function onConnect() {
    if (busy) return;
    setBusy(true);
    try {
      await connect();
    } catch (cause) {
      fail("Wallet", cause);
    } finally {
      setBusy(false);
    }
  }

  function onHoldCard() {
    Alert.alert("Coming next", "Card claim lands with the Java Card slice.");
  }

  async function runClaim(row: EstateRow) {
    if (busy) return;
    setBusy(true);
    try {
      const sig = await claimAll(row);
      setExtra((prev) => prev.filter((item) => item.address !== row.address));
      reload();
      Alert.alert("Estate claimed", "Assets are in this wallet. The vault closed.", [
        { text: "OK" },
        { text: "View on explorer", onPress: () => openExplorerTx(sig) },
      ]);
    } catch (cause) {
      fail("Claim", cause);
    } finally {
      setBusy(false);
    }
  }

  function onClaim(row: EstateRow) {
    if (busy) return;
    const state = presentEstate(row.data, row.claimableLamports).state;
    if (state !== "claimable") {
      Alert.alert("Not yet", "This vault is not open to claim.");
      return;
    }
    const label = row.data.label.trim() || "estate";
    prompt(
      {
        cap: "Claim",
        title: `Claim ${label}?`,
        body: "Assets move to this wallet. 0.75% is taken from the vault. The vault then closes.",
        confirmLabel: "Claim inheritance",
      },
      () => void runClaim(row),
    );
  }

  async function onLookup() {
    if (busy || !account) return;
    setBusy(true);
    try {
      const owner = parseAddress(ownerQuery, "owner");
      const row = await fetchEstateByPair(client.rpc, owner, account.address);
      if (row === undefined) {
        throw new Error("No estate for that owner with this wallet as heir.");
      }
      setExtra((prev) => mergeRows(prev, [row]));
      setShowLookup(false);
    } catch (cause) {
      fail("Lookup", cause);
    } finally {
      setBusy(false);
    }
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
                disabled={busy}
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
            busy={busy}
            showLookup={showLookup}
            ownerQuery={ownerQuery}
            setOwnerQuery={setOwnerQuery}
            onClaim={onClaim}
            onHoldCard={onHoldCard}
            onToggleLookup={() => setShowLookup((open) => !open)}
            onLookup={() => void onLookup()}
          />
        )}
      </ScrollView>
      <ConfirmSheet ask={ask} onCancel={cancel} onConfirm={confirm} />
    </View>
  );
}
