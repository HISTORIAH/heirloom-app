import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AddressLookup } from "@/components/AddressLookup";
import { ConnectWallet } from "@/components/EmptyState";
import { AppHeader } from "@/components/AppHeader";
import { ChainLoading } from "@/components/ChainLoading";
import { ConfirmSheet, useConfirmSheet } from "@/components/ConfirmSheet";
import { DayRuler } from "@/components/DayRuler";
import { HoldCheckIn } from "@/components/HoldCheckIn";
import { InkToast } from "@/components/InkToast";
import { NfcDummyCard } from "@/components/NfcDummyCard";
import { QuietRow, RowAddress, SectionLabel } from "@/components/Quiet";
import { StateSlab } from "@/components/StateSlab";
import { useEstates } from "@/hooks/useEstates";
import { useHeirTx } from "@/hooks/useHeirTx";
import type { EstateUiState } from "@/lib/estateState";
import { fetchEstateByPair, type EstateRow } from "@/lib/estates";
import { unwrapOption } from "@/lib/option";
import { parseAddress } from "@/lib/ownerWrites";
import { presentEstate } from "@/lib/presentEstate";
import { presentHeartbeat } from "@/lib/presentHeartbeat";
import { colors } from "@/theme";

function useTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

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

function HeartbeatListRow({ row, onPress }: { row: EstateRow; onPress: () => void }) {
  const view = presentHeartbeat(row.data, row.claimableLamports);
  const name = row.data.label.trim() || "Estate";
  const ruler = view.showRuler ? (
    <DayRuler
      compact
      intervalDays={view.intervalDays}
      graceDays={view.graceDays}
      elapsedDays={view.elapsedDays}
      legendFrom={view.legendFrom}
      legendTo={view.legendTo}
    />
  ) : undefined;
  return (
    <QuietRow
      title={name}
      desc={view.eyebrow}
      onPress={onPress}
      right={<RowAddress address={String(row.data.authority)} />}
      footer={ruler}
    />
  );
}

export default function HeartbeatScreen() {
  const { account, client, connect } = useMobileWallet();
  const { rows, loading, error, reload } = useEstates("hbSigner");
  const { sendHeartbeat } = useHeirTx();
  const [busy, setBusy] = useState(false);
  const [beating, setBeating] = useState(false);
  const [holding, setHolding] = useState(false);
  const [toast, setToast] = useState<string | undefined>(undefined);
  const [picked, setPicked] = useState(0);
  const [showLookup, setShowLookup] = useState(false);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [heirQuery, setHeirQuery] = useState("");
  const [extra, setExtra] = useState<EstateRow[]>([]);
  const { ask, notice, fail, cancel, confirm, extra: runExtra } = useConfirmSheet();
  useTick();

  const ordered = useMemo(() => sortAsSigner(mergeRows(rows, extra)), [rows, extra]);
  const selected = ordered[picked];

  useEffect(() => {
    if (picked >= ordered.length) setPicked(0);
  }, [picked, ordered.length]);

  useEffect(() => {
    if (toast === undefined) return;
    const id = setTimeout(() => setToast(undefined), 2600);
    return () => clearTimeout(id);
  }, [toast]);

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
    notice({
      cap: "Coming next",
      title: "Card heartbeat lands later",
    });
  }

  function onBeat() {
    const row = selected;
    if (!row || busy) return;
    const view = presentHeartbeat(row.data, row.claimableLamports);
    if (!view.canHold) return;
    setBusy(true);
    setBeating(true);
    void (async () => {
      try {
        await sendHeartbeat(row.data.authority, row.data.heir);
        let next: EstateRow | undefined;
        try {
          next = await fetchEstateByPair(client.rpc, row.data.authority, row.data.heir);
        } catch {
          next = undefined;
        }
        setExtra((prev) => {
          const rest = prev.filter((item) => item.address !== row.address);
          return next === undefined ? rest : [...rest, next];
        });
        await reload();
        setToast("Checked in.");
      } catch (cause) {
        fail("Heartbeat", cause);
      } finally {
        setBusy(false);
        setBeating(false);
      }
    })();
  }

  async function onLookup() {
    if (busy || !account) return;
    setBusy(true);
    try {
      const owner = parseAddress(ownerQuery, "owner");
      const heir = parseAddress(heirQuery, "heir");
      const row = await fetchEstateByPair(client.rpc, owner, heir);
      if (row === undefined) throw new Error("No estate for that owner and heir.");
      const signer = unwrapOption(row.data.hbSigner);
      if (signer === null || signer !== account.address) {
        throw new Error("This wallet is not the check-in signer on that estate.");
      }
      setExtra((prev) => mergeRows(prev, [row]));
      setShowLookup(false);
      setPicked(0);
    } catch (cause) {
      fail("Lookup", cause);
    } finally {
      setBusy(false);
    }
  }

  let body;
  if (!account) {
    body = (
      <ConnectWallet
        busy={busy}
        onConnect={() => void onConnect()}
      />
    );
  } else if (loading && ordered.length === 0) {
    body = (
      <>
        <AppHeader />
        <ChainLoading body="Looking for estates you sign for…" />
      </>
    );
  } else if (error !== null && ordered.length === 0) {
    body = (
      <>
        <AppHeader />
        <View style={{ padding: 20 }}>
          <Text style={{ fontFamily: "SpaceGrotesk_500Medium", fontSize: 15, color: colors.mute }}>
            {error}
          </Text>
        </View>
      </>
    );
  } else if (selected === undefined) {
    body = (
      <StateSlab
        color={colors.soft}
        underStatusBar
        headline="No check-in role"
        leading={<AppHeader plain />}
      >
        <Pressable
          onPress={onHoldCard}
          accessibilityRole="button"
          accessibilityLabel="Hold the card to the phone"
          style={{ alignItems: "center", marginTop: 22 }}
        >
          <NfcDummyCard width={260} />
        </Pressable>
      </StateSlab>
    );
  } else {
    const view = presentHeartbeat(selected.data, selected.claimableLamports);
    body = (
      <>
        <StateSlab
          color={view.slab}
          underStatusBar
          eyebrow={view.eyebrow}
          value={view.value}
          unit={view.unit}
          advice={view.advice}
          leading={<AppHeader plain />}
        >
          {view.showRuler ? (
            <DayRuler
              intervalDays={view.intervalDays}
              graceDays={view.graceDays}
              elapsedDays={view.elapsedDays}
              legendFrom={view.legendFrom}
              legendTo={view.legendTo}
            />
          ) : null}
          <HoldCheckIn
            label={view.hold}
            busy={beating}
            disabled={!view.canHold || busy}
            onComplete={onBeat}
            onHoldingChange={setHolding}
          />
        </StateSlab>
        <View style={{ paddingHorizontal: 20, paddingTop: 30 }}>
          <SectionLabel title="Estates you check in for" />
          <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
            {ordered.map((row, index) => (
              <HeartbeatListRow
                key={row.address}
                row={row}
                onPress={() => setPicked(index)}
              />
            ))}
          </View>
          <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
            <QuietRow
              title={showLookup ? "Hide lookup" : "Look up by owner and heir"}
              onPress={() => setShowLookup((open) => !open)}
            />
          </View>
          {showLookup ? (
            <View style={{ marginTop: 12 }}>
              <AddressLookup
                fields={[
                  { key: "owner", label: "Owner", value: ownerQuery, onChange: setOwnerQuery },
                  { key: "heir", label: "Heir", value: heirQuery, onChange: setHeirQuery },
                ]}
                submitLabel="Find estate"
                busy={busy}
                onSubmit={() => void onLookup()}
              />
            </View>
          ) : null}
        </View>
        <View style={{ height: 130 }} />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} scrollEnabled={!holding}>
        {body}
      </ScrollView>
      <ConfirmSheet ask={ask} onCancel={cancel} onConfirm={confirm} onExtra={runExtra} />
      <InkToast text={toast} />
    </View>
  );
}
