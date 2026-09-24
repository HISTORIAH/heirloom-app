import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { ConnectWallet } from "@/components/EmptyState";
import { ChainLoading } from "@/components/ChainLoading";
import { ConfirmSheet, useConfirmSheet } from "@/components/ConfirmSheet";
import { DayRuler } from "@/components/DayRuler";
import { HoldCheckIn } from "@/components/HoldCheckIn";
import { QuietRow, RowAddress, SectionLabel } from "@/components/Quiet";
import { StateSlab } from "@/components/StateSlab";
import { useEstates } from "@/hooks/useEstates";
import type { EstateRow } from "@/lib/estates";
import { gateKind, presentGuardian } from "@/lib/presentGuardian";
import { colors } from "@/theme";

function useTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

function rank(row: EstateRow): number {
  const kind = gateKind(row);
  if (kind === "holdable") return 0;
  if (kind === "holding") return 1;
  if (kind === "unset") return 2;
  if (kind === "spent") return 3;
  if (kind === "late") return 4;
  return 5;
}

function GuardianListRow({ row, onPress }: { row: EstateRow; onPress: () => void }) {
  const view = presentGuardian(row);
  const name = row.data.label.trim() || "Estate";
  return (
    <QuietRow
      title={name}
      desc={view.eyebrow}
      onPress={onPress}
      right={<RowAddress address={String(row.data.authority)} />}
    />
  );
}

export default function GuardianScreen() {
  const { account, connect } = useMobileWallet();
  const { rows, loading, error } = useEstates("delegate");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState(0);
  const { ask, notice, fail, cancel, confirm, extra } = useConfirmSheet();
  useTick();

  const ordered = useMemo(() => [...rows].sort((a, b) => rank(a) - rank(b)), [rows]);
  const selected = ordered[picked];

  useEffect(() => {
    if (picked >= ordered.length) setPicked(0);
  }, [picked, ordered.length]);

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

  function onLookup() {
    notice({
      cap: "Coming next",
      title: "Lookup comes later",
    });
  }

  function onPause() {
    const row = selected;
    if (row === undefined) return;
    const view = presentGuardian(row);
    if (!view.canHold) return;
    notice({
      cap: "Coming next",
      title: "Not in this slice",
    });
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
        <ChainLoading body="Looking for estates you guard…" />
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
        headline="No guardian role"
        leading={<AppHeader plain />}
      />
    );
  } else {
    const view = presentGuardian(selected);
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
          {view.pauseDays > 0 ? (
            <DayRuler
              intervalDays={0}
              graceDays={view.pauseDays}
              elapsedDays={view.elapsedPause}
              legendFrom={view.legendFrom}
              legendTo={view.legendTo}
              shortLabel={view.legendTo}
            />
          ) : null}
          <HoldCheckIn
            label={view.hold}
            disabled={!view.canHold}
            onComplete={onPause}
          />
        </StateSlab>
        <View style={{ paddingHorizontal: 20, paddingTop: 30 }}>
          <SectionLabel title="Estates you guard" />
          <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
            {ordered.map((row, index) => (
              <GuardianListRow
                key={row.address}
                row={row}
                onPress={() => setPicked(index)}
              />
            ))}
            <QuietRow title="Look up by owner and heir" onPress={onLookup} />
          </View>
          <View style={{ height: 130 }} />
        </View>
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        {body}
      </ScrollView>
      <ConfirmSheet ask={ask} onCancel={cancel} onConfirm={confirm} onExtra={extra} />
    </View>
  );
}
