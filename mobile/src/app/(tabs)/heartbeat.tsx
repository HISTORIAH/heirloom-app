import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { AddressLookup } from "@/components/AddressLookup";
import { AppHeader } from "@/components/AppHeader";
import { ChainLoading } from "@/components/ChainLoading";
import { ConfirmSheet, useConfirmSheet } from "@/components/ConfirmSheet";
import { PulseTicket, SignerHoldWell } from "@/components/PulseTicket";
import { Cap, H2, Lede, PrimaryButton, TextLink } from "@/components/ui";
import { useEstates } from "@/hooks/useEstates";
import { useHeirTx } from "@/hooks/useHeirTx";
import type { EstateUiState } from "@/lib/estateState";
import { fetchEstateByPair, type EstateRow } from "@/lib/estates";
import { openExplorerTx } from "@/lib/explorer";
import { unwrapOption } from "@/lib/option";
import { parseAddress } from "@/lib/ownerWrites";
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

function mergeRows(discovered: EstateRow[], extra: EstateRow[]): EstateRow[] {
  const byAddr = new Map<string, EstateRow>();
  for (const row of extra) byAddr.set(row.address, row);
  for (const row of discovered) byAddr.set(row.address, row);
  return [...byAddr.values()];
}

function HeartbeatConnected({
  loading,
  error,
  ordered,
  dueCount,
  busy,
  showLookup,
  ownerQuery,
  heirQuery,
  setOwnerQuery,
  setHeirQuery,
  onBeat,
  onHold,
  onToggleLookup,
  onLookup,
}: {
  loading: boolean;
  error: string | null;
  ordered: EstateRow[];
  dueCount: number;
  busy: boolean;
  showLookup: boolean;
  ownerQuery: string;
  heirQuery: string;
  setOwnerQuery: (value: string) => void;
  setHeirQuery: (value: string) => void;
  onBeat: (row: EstateRow) => void;
  onHold: () => void;
  onToggleLookup: () => void;
  onLookup: () => void;
}) {
  const lookup = (
    <View style={{ gap: 12 }}>
      <TextLink
        label={showLookup ? "Hide lookup" : "Look up by owner and heir"}
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
            {
              key: "heir",
              label: "Heir",
              value: heirQuery,
              onChange: setHeirQuery,
            },
          ]}
          submitLabel="Find estate"
          busy={busy}
          onSubmit={onLookup}
        />
      ) : null}
      <SignerHoldWell onHold={onHold} />
    </View>
  );

  if (loading) {
    return <ChainLoading compact body="Looking for estates you sign for…" />;
  }

  if (error !== null) {
    return (
      <View style={{ marginTop: 20, gap: 16 }}>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_500Medium",
            color: colors.mute,
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
            This wallet is not the heartbeat signer on any estate. Look up by
            owner and heir, or wait for card tap.
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
        <PulseTicket key={row.address} row={row} busy={busy} onBeat={onBeat} />
      ))}
      {lookup}
    </View>
  );
}

export default function HeartbeatScreen() {
  const { account, client, connect } = useMobileWallet();
  const { rows, loading, error, reload } = useEstates("hbSigner");
  const { sendHeartbeat } = useHeirTx();
  const [busy, setBusy] = useState(false);
  const [showLookup, setShowLookup] = useState(false);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [heirQuery, setHeirQuery] = useState("");
  const [extra, setExtra] = useState<EstateRow[]>([]);
  const { ask, prompt, notice, fail, cancel, confirm, extra: runExtra } =
    useConfirmSheet();
  const ordered = useMemo(
    () => sortAsSigner(mergeRows(rows, extra)),
    [rows, extra],
  );
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
      fail("Wallet", cause);
    } finally {
      setBusy(false);
    }
  }

  function onHold() {
    notice({
      cap: "Coming next",
      title: "Card heartbeat lands later",
      body: "Card heartbeat lands with the Java Card slice.",
    });
  }

  async function runBeat(row: EstateRow) {
    if (busy) return;
    setBusy(true);
    try {
      const sig = await sendHeartbeat(row.data.authority, row.data.heir);
      let next: EstateRow | undefined;
      try {
        next = await fetchEstateByPair(
          client.rpc,
          row.data.authority,
          row.data.heir,
        );
      } catch {
        next = undefined;
      }
      setExtra((prev) => {
        const rest = prev.filter((item) => item.address !== row.address);
        return next === undefined ? rest : [...rest, next];
      });
      await reload();
      notice(
        {
          cap: "Done",
          title: "Heartbeat sent",
          body: "The check-in timer starts again.",
          extraLabel: "View on explorer",
        },
        () => openExplorerTx(sig),
      );
    } catch (cause) {
      fail("Heartbeat", cause);
    } finally {
      setBusy(false);
    }
  }

  function onBeat(row: EstateRow) {
    if (busy) return;
    const state = presentEstate(row.data, row.claimableLamports).state;
    if (state === "distributed") {
      notice({
        cap: "Ended",
        title: "This vault is empty",
        body: "No pulse left to send.",
      });
      return;
    }
    const label = row.data.label.trim() || "estate";
    const reclaim = state === "claimable";
    prompt(
      {
        cap: "Heartbeat",
        title: reclaim ? `Reclaim ${label}?` : `Send a heartbeat for ${label}?`,
        body: "This only resets the timer. It cannot move assets.",
        confirmLabel: reclaim ? "I'm alive" : "Send heartbeat",
      },
      () => void runBeat(row),
    );
  }

  async function onLookup() {
    if (busy || !account) return;
    setBusy(true);
    try {
      const owner = parseAddress(ownerQuery, "owner");
      const heir = parseAddress(heirQuery, "heir");
      const row = await fetchEstateByPair(client.rpc, owner, heir);
      if (row === undefined) {
        throw new Error("No estate for that owner and heir.");
      }
      const signer = unwrapOption(row.data.hbSigner);
      if (signer === null || signer !== account.address) {
        throw new Error("This wallet is not the heartbeat signer on that estate.");
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
                disabled={busy}
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
            busy={busy}
            showLookup={showLookup}
            ownerQuery={ownerQuery}
            heirQuery={heirQuery}
            setOwnerQuery={setOwnerQuery}
            setHeirQuery={setHeirQuery}
            onBeat={onBeat}
            onHold={onHold}
            onToggleLookup={() => setShowLookup((open) => !open)}
            onLookup={() => void onLookup()}
          />
        )}
      </ScrollView>
      <ConfirmSheet
        ask={ask}
        onCancel={cancel}
        onConfirm={confirm}
        onExtra={runExtra}
      />
    </View>
  );
}
