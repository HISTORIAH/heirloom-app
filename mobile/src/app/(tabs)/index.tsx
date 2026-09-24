import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChainLoading } from "@/components/ChainLoading";
import { ConfirmSheet, useConfirmSheet } from "@/components/ConfirmSheet";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ConnectWallet, EmptyState } from "@/components/EmptyState";
import { EstateDetail } from "@/components/EstateDetail";
import { InkToast } from "@/components/InkToast";
import { useEstates } from "@/hooks/useEstates";
import { useOwnerTx } from "@/hooks/useOwnerTx";
import { waitUntilAccountGone } from "@/lib/confirm";
import { openExplorerTx } from "@/lib/explorer";
import { takeFlash } from "@/lib/flash";
import { colors } from "@/theme";
import type { Address } from "@solana/kit";

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { account, connect, disconnect, client } = useMobileWallet();
  const { rows, loading, error, reload, drop } = useEstates("authority");
  const { checkIn, topUpSol, reassignHeir, closeEstate, updateSettings, addToken } =
    useOwnerTx();
  const [picked, setPicked] = useState(0);
  const [busy, setBusy] = useState(false);
  const [checkInBusy, setCheckInBusy] = useState(false);
  const [holding, setHolding] = useState(false);
  const [toast, setToast] = useState<string | undefined>(undefined);
  const { ask, prompt, notice, fail, cancel, confirm, extra } = useConfirmSheet();
  const filled = Boolean(account) && !loading && error === null && rows.length > 0;

  useEffect(() => {
    if (picked >= rows.length) setPicked(0);
  }, [picked, rows.length]);

  useEffect(() => {
    if (toast === undefined) return;
    const id = setTimeout(() => setToast(undefined), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      const text = takeFlash();
      if (text !== undefined) setToast(text);
    }, []),
  );

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

  async function onDisconnect() {
    if (busy) return;
    setBusy(true);
    try {
      await disconnect();
    } catch (cause) {
      fail("Wallet", cause);
    } finally {
      setBusy(false);
    }
  }

  function onNewEstate() {
    router.push("/create");
  }

  const selected = rows[picked];

  async function runOwner(
    title: string,
    work: () => Promise<string>,
    okTitle: string,
    okBody?: string,
    gone?: Address,
  ) {
    if (busy) return;
    setBusy(true);
    try {
      const sig = await work();
      if (gone !== undefined) {
        await waitUntilAccountGone(client.rpc, gone);
        drop(gone);
        setPicked(0);
      }
      const next = await reload();
      if (gone !== undefined && next.some((row) => row.address === gone)) {
        throw new Error(
          "This estate is still on chain. Open the dashboard again in a moment.",
        );
      }
      notice(
        {
          cap: "Done",
          title: okTitle,
          body: okBody,
          extraLabel: "View on explorer",
        },
        () => openExplorerTx(sig),
      );
    } catch (cause) {
      fail(title, cause);
    } finally {
      setBusy(false);
    }
  }

  function onCheckIn() {
    const row = selected;
    if (!row || busy) return;
    setBusy(true);
    setCheckInBusy(true);
    void (async () => {
      try {
        await checkIn(row.data.heir);
        await reload();
        setToast("Checked in.");
      } catch (cause) {
        fail("Check-in", cause);
      } finally {
        setBusy(false);
        setCheckInBusy(false);
      }
    })();
  }

  function onAddSol(lamports: bigint) {
    const row = selected;
    if (!row || busy) return;
    prompt(
      {
        cap: "Add SOL",
        title: "Lock this SOL in the vault?",
        confirmLabel: "Add SOL",
      },
      () =>
        void runOwner(
          "Top up",
          () => topUpSol(row.data.heir, lamports),
          "SOL added",
        ),
    );
  }

  function onReassign(newHeir: Address) {
    const row = selected;
    if (!row || busy) return;
    prompt(
      {
        cap: "Change heir",
        title: "Move this vault to a new heir?",
        confirmLabel: "Change heir",
      },
      () =>
        void runOwner(
          "Change heir",
          () => reassignHeir(row, newHeir),
          "Heir changed",
          undefined,
          row.address,
        ),
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
    prompt(
      {
        cap: "Update timing",
        title: "Save these timings?",
        body: "This also counts as a check-in.",
        confirmLabel: "Save",
      },
      () =>
        void runOwner(
          "Update timing",
          () => updateSettings(row, fields),
          "Timing saved",
        ),
    );
  }

  function onAddAsset(mint: Address, amount: bigint) {
    const row = selected;
    if (!row || busy) return;
    prompt(
      {
        cap: "Add asset",
        title: "Register this mint?",
        body: "Not a top-up of a token already in this vault.",
        confirmLabel: "Add token",
      },
      () =>
        void runOwner(
          "Add asset",
          () => addToken(row, mint, amount),
          "Token added",
        ),
    );
  }

  function onCloseEstate() {
    const row = selected;
    if (!row || busy) return;
    prompt(
      {
        cap: "Danger",
        title: "Close this estate?",
        body: "0.5% fee. This cannot be undone.",
        cancelLabel: "Keep estate",
        confirmLabel: "Close estate",
      },
      () =>
        void runOwner(
          "Close estate",
          () => closeEstate(row),
          "Estate closed",
          undefined,
          row.address,
        ),
    );
  }

  let body;
  if (!account) {
    body = <ConnectWallet busy={busy} onConnect={onConnect} />;
  } else if (loading) {
    body = <ChainLoading body="Looking for your estates…" />;
  } else if (error !== null) {
    body = (
      <EmptyState
        title="Could not load"
        body={error}
        primaryLabel="Disconnect"
        onPrimary={onDisconnect}
      />
    );
  } else if (rows.length === 0) {
    body = (
      <EmptyState
        title="No vault yet"
        primaryLabel="Create your estate"
        onPrimary={onNewEstate}
        secondaryLabel="Claim inheritance"
        onSecondary={() => router.push("/claim")}
        tertiaryLabel="Disconnect wallet"
        onTertiary={onDisconnect}
      />
    );
  } else {
    body = (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled={!holding}
      >
        {selected ? (
          <EstateDetail
            row={selected}
            rows={rows}
            picked={picked}
            onSelect={setPicked}
            rpc={client.rpc}
            onCheckIn={onCheckIn}
            onAddSol={onAddSol}
            onReassign={onReassign}
            onTiming={onTiming}
            onAddAsset={onAddAsset}
            onCloseEstate={onCloseEstate}
            adding={busy}
            checkingIn={checkInBusy}
            onHoldingChange={setHolding}
          />
        ) : null}
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {filled || !account ? null : (
        <View
          style={{
            paddingTop: Math.max(insets.top, 8),
            paddingHorizontal: 20,
            backgroundColor: colors.bg,
          }}
        >
          <DashboardHeader />
        </View>
      )}
      {body}
      <ConfirmSheet
        ask={ask}
        onCancel={cancel}
        onConfirm={confirm}
        onExtra={extra}
      />
      <InkToast text={toast} />
    </View>
  );
}
