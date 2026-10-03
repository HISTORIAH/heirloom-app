import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChainLoading } from "@/components/ChainLoading";
import { ConfirmSheet, useConfirmSheet } from "@/components/ConfirmSheet";
import { EstateAssets } from "@/components/EstateAssets";
import { EstateManage } from "@/components/EstateManage";
import { EstatePeople } from "@/components/EstatePeople";
import { InkToast } from "@/components/InkToast";
import { RemindersSection } from "@/components/reminders/RemindersSection";
import { TopUpSheet } from "@/components/topUp/TopUpSheet";
import { EstateHero } from "@/components/home/EstateHero";
import { Cap, IconButton } from "@/components/ui";
import { BACKEND_URL } from "@/config";
import { colors, space } from "@/theme";
import type { EstateTimingFields, TopUpPick } from "@/types/estate";
import type { Address } from "@solana/kit";
import { useEstateHoldings, useEstates, useOwnerTx, useRenameEstate } from "@/hooks";
import {
  estateName,
  estateSpan,
  openExplorerTx,
  rawToUiText,
  registeredTokenCount,
  setFlash,
  shortAddress,
  unwrapOption,
  waitUntilAccountGone,
} from "@/lib";

export default function EstateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { address } = useLocalSearchParams<{ address: string }>();
  const { client } = useMobileWallet();
  const { rows, loading, reload, drop } = useEstates("authority");
  const { checkIn, topUpSol, topUpToken, reassignHeir, closeEstate, updateSettings, addToken } = useOwnerTx();
  const renameMutation = useRenameEstate();
  const [busy, setBusy] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [toast, setToast] = useState<string | undefined>(undefined);
  /** Open deposit sheet; `startAt` jumps to one asset's amount step. */
  const [topUp, setTopUp] = useState<{ startAt?: string } | undefined>(undefined);
  const { ask, prompt, notice, fail, cancel, confirm, extra } = useConfirmSheet();

  const row = rows.find((item) => item.address === address);
  const holdings = useEstateHoldings(row);

  useEffect(() => {
    if (toast === undefined) return;
    const id = setTimeout(() => setToast(undefined), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  /** Runs an owner write. `gone` means the estate account closes and we leave. */
  async function runOwner(
    title: string,
    work: () => Promise<string>,
    okTitle: string,
    gone?: Address,
  ) {
    if (busy) return;
    setBusy(true);
    try {
      const sig = await work();
      if (gone !== undefined) {
        await waitUntilAccountGone(client.rpc, gone);
        drop(gone);
        setFlash(okTitle);
        back();
        return;
      }
      await Promise.all([reload(), holdings.refetch()]);
      notice({ cap: "Done", title: okTitle, extraLabel: "View on explorer" }, () =>
        openExplorerTx(sig),
      );
    } catch (cause) {
      fail(title, cause);
    } finally {
      setBusy(false);
    }
  }

  if (row === undefined) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bg, paddingTop: Math.max(insets.top, 12) + 8 }}
      >
        <View style={{ paddingHorizontal: space.pad }}>
          <IconButton icon="chevronLeft" label="Back" onPress={back} />
        </View>
        {loading ? (
          <ChainLoading body="Loading this estate…" />
        ) : (
          <ChainLoading body="This estate isn’t on this wallet any more." />
        )}
      </View>
    );
  }

  const current = row;
  const live = estateSpan(current.data, current.claimableLamports).state !== "distributed";
  const signer = unwrapOption(current.data.checkInSigner);
  const guardian = unwrapOption(current.data.delegate);

  function onCheckIn() {
    if (busy) return;
    setBusy(true);
    setCheckingIn(true);
    void (async () => {
      try {
        await checkIn(current.data.heir);
        await reload();
        setToast("Checked in.");
      } catch (cause) {
        fail("Check-in", cause);
      } finally {
        setBusy(false);
        setCheckingIn(false);
      }
    })();
  }

  function onTopUp({ asset, amount }: TopUpPick) {
    setTopUp(undefined);
    const heir = current.data.heir;
    const mint = asset.mint;
    const done = `${rawToUiText(amount, asset.decimals)} ${asset.symbol} deposited`;
    if (mint === undefined) {
      void runOwner("Deposit", () => topUpSol(heir, amount), done);
    } else if (asset.registered) {
      void runOwner("Deposit", () => topUpToken(heir, mint, amount), done);
    } else {
      // Not in the estate yet: register_asset opens the vault account and moves the first amount.
      void runOwner("Deposit", () => addToken(current, mint, amount), done);
    }
  }

  function onReassign(newHeir: Address) {
    prompt(
      { cap: "Change heir", title: "Move this estate to a new heir?", confirmLabel: "Change heir" },
      () =>
        void runOwner(
          "Change heir",
          () => reassignHeir(current, newHeir),
          "Heir changed",
          current.address,
        ),
    );
  }

  function onTiming(fields: EstateTimingFields) {
    prompt(
      {
        cap: "Update timing",
        title: "Save these timings?",
        body: "This also counts as a check-in.",
        confirmLabel: "Save",
      },
      () => void runOwner("Update timing", () => updateSettings(current, fields), "Timing saved"),
    );
  }

  async function onRename(name: string): Promise<void> {
    try {
      await renameMutation.mutateAsync({ estateAddress: String(current.address), name });
      setToast("Name saved.");
    } catch (cause) {
      fail("Rename", cause);
      throw cause;
    }
  }

  function onClose() {
    prompt(
      {
        cap: "Close estate",
        title: "Close this estate?",
        body: "Everything returns to this wallet. 0.5% fee. This cannot be undone.",
        cancelLabel: "Keep estate",
        confirmLabel: "Close estate",
      },
      () =>
        void runOwner("Close estate", () => closeEstate(current), "Estate closed", current.address),
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 12) + 8,
          paddingHorizontal: space.pad,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <IconButton icon="chevronLeft" label="Back" onPress={back} />
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontFamily: "SpaceGrotesk_700Bold", fontSize: 18, color: colors.ink }}
        >
          {estateName(current)}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.pad,
          paddingTop: 2,
          paddingBottom: Math.max(insets.bottom, 16) + 40,
          gap: 16,
        }}
      >
        <EstateHero
          row={current}
          compact
          busy={checkingIn}
          disabled={busy}
          onCheckIn={onCheckIn}
        />

        <EstateAssets
          holdings={holdings.holdings}
          totalUsd={holdings.totalUsd}
          loading={holdings.loading && registeredTokenCount(current.data.claimableAssets) > 0}
          error={holdings.error}
          distributed={!live}
          onTopUp={(startAt) => setTopUp({ startAt })}
          adding={busy}
        />

        <View style={{ gap: 12 }}>
          <Cap>Named on this estate</Cap>
          <EstatePeople
            heir={String(current.data.heir)}
            heartbeat={signer ?? undefined}
            guardian={guardian ?? undefined}
          />
        </View>

        {live && BACKEND_URL !== undefined ? (
          <RemindersSection
            estateAddress={String(current.address)}
            estateName={estateName(current)}
            heirLabel={`Heir ${shortAddress(String(current.data.heir))}`}
          />
        ) : null}

        {live ? (
          <View style={{ gap: 12 }}>
            <Cap>Manage</Cap>
            <EstateManage
              row={current}
              busy={busy}
              onReassign={onReassign}
              onTiming={onTiming}
              onClose={onClose}
              onRename={onRename}
            />
          </View>
        ) : null}
      </ScrollView>
      {topUp !== undefined ? (
        <TopUpSheet
          row={current}
          holdings={holdings.holdings}
          startAt={topUp.startAt}
          onClose={() => setTopUp(undefined)}
          onSubmit={onTopUp}
        />
      ) : null}
      <ConfirmSheet ask={ask} onCancel={cancel} onConfirm={confirm} onExtra={extra} />
      <InkToast text={toast} />
    </View>
  );
}
