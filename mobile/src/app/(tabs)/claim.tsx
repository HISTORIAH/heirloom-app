import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AddressLookup } from "@/components/AddressLookup";
import { ConnectWallet } from "@/components/EmptyState";
import { AppHeader } from "@/components/AppHeader";
import { ChainLoading } from "@/components/ChainLoading";
import { ConfirmSheet, useConfirmSheet } from "@/components/ConfirmSheet";
import { DayRuler } from "@/components/DayRuler";
import { EstatePicker } from "@/components/EstatePicker";
import { HoldCheckIn } from "@/components/HoldCheckIn";
import { InkToast } from "@/components/InkToast";
import { NfcDummyCard } from "@/components/NfcDummyCard";
import { QuietRow, RowAddress, SectionLabel } from "@/components/Quiet";
import { StateSlab } from "@/components/StateSlab";
import { useEstates } from "@/hooks/useEstates";
import { useHeirTx } from "@/hooks/useHeirTx";
import type { EstateUiState } from "@/lib/estateState";
import { fetchEstateByPair, type EstateRow } from "@/lib/estates";
import { parseAddress } from "@/lib/ownerWrites";
import { presentClaim } from "@/lib/presentClaim";
import { presentEstate } from "@/lib/presentEstate";
import { colors } from "@/theme";

function useTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

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

function CardPress({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Hold the card to the phone"
      style={{ alignItems: "center", marginTop: 8 }}
    >
      <NfcDummyCard width={260} />
    </Pressable>
  );
}

export default function ClaimScreen() {
  const { account, client, connect } = useMobileWallet();
  const { rows, loading, error, reload } = useEstates("heir");
  const { claimAll } = useHeirTx();
  const [busy, setBusy] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [holding, setHolding] = useState(false);
  const [toast, setToast] = useState<string | undefined>(undefined);
  const [picked, setPicked] = useState(0);
  const [showLookup, setShowLookup] = useState(false);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [extra, setExtra] = useState<EstateRow[]>([]);
  const { ask, notice, fail, cancel, confirm, extra: runExtra } = useConfirmSheet();
  useTick();

  const ordered = useMemo(() => sortAsHeir(mergeRows(rows, extra)), [rows, extra]);
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
      title: "Card claim lands later",
    });
  }

  function onClaim() {
    const row = selected;
    if (!row || busy) return;
    const view = presentClaim(row.data, row.claimableLamports);
    if (!view.canHold) return;
    setBusy(true);
    setClaiming(true);
    void (async () => {
      try {
        await claimAll(row);
        setExtra((prev) => prev.filter((item) => item.address !== row.address));
        await reload();
        setToast("Claimed. Assets are in this wallet.");
      } catch (cause) {
        fail("Claim", cause);
      } finally {
        setBusy(false);
        setClaiming(false);
      }
    })();
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
        <ChainLoading body="Looking for estates that name you…" />
      </>
    );
  } else if (error !== null && ordered.length === 0) {
    body = (
      <>
        <AppHeader />
        <View style={{ padding: 20 }}>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 15,
              color: colors.claim,
            }}
          >
            {error}
          </Text>
        </View>
      </>
    );
  } else if (ordered.length === 0 || selected === undefined) {
    body = (
      <>
        <StateSlab
          color={colors.soft}
          underStatusBar
          headline="No estates yet"
          leading={<AppHeader plain />}
        >
          <CardPress onPress={onHoldCard} />
        </StateSlab>
        <View style={{ paddingHorizontal: 20, paddingTop: 30 }}>
          <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
            <QuietRow
              title={showLookup ? "Hide owner lookup" : "Look up by owner"}
              onPress={() => setShowLookup((open) => !open)}
            />
          </View>
          {showLookup ? (
            <View style={{ marginTop: 12 }}>
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
                onSubmit={() => void onLookup()}
              />
            </View>
          ) : null}
        </View>
      </>
    );
  } else {
    const view = presentClaim(selected.data, selected.claimableLamports);
    body = (
      <>
        <StateSlab
          color={view.slab}
          underStatusBar
          eyebrow={view.eyebrow}
          value={view.value}
          unit={view.unit}
          advice={view.advice}
          leading={
            <>
              <AppHeader plain />
              <EstatePicker rows={ordered} selected={picked} onSelect={setPicked} />
            </>
          }
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
            busy={claiming}
            disabled={!view.canHold || busy}
            onComplete={onClaim}
            onHoldingChange={setHolding}
          />
        </StateSlab>
        <View style={{ paddingHorizontal: 20, paddingTop: 30 }}>
          <SectionLabel title="Named as heir" />
          <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
            {ordered.map((row, index) => {
              const claim = presentClaim(row.data, row.claimableLamports);
              const name = row.data.label.trim() || "Estate";
              return (
                <QuietRow
                  key={row.address}
                  title={name}
                  desc={claim.eyebrow}
                  onPress={() => setPicked(index)}
                  right={<RowAddress address={String(row.data.authority)} />}
                />
              );
            })}
            <QuietRow
              title={showLookup ? "Hide owner lookup" : "Look up by owner"}
              onPress={() => setShowLookup((open) => !open)}
            />
          </View>
          {showLookup ? (
            <View style={{ marginTop: 12 }}>
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled={!holding}
      >
        {body}
      </ScrollView>
      <ConfirmSheet ask={ask} onCancel={cancel} onConfirm={confirm} onExtra={runExtra} />
      <InkToast text={toast} />
    </View>
  );
}
