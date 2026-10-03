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
import { EstateHero } from "@/components/home/EstateHero";
import { Cap, IconButton } from "@/components/ui";
import { colors, space } from "@/theme";
import type { EstateTimingFields } from "@/types/estate";
import type { Address } from "@solana/kit";
import { useEstates, useRenameEstate } from "@/hooks";
import {
  estateName,
  estateSpan,
  openExplorerTx,
  registeredTokenCount,
  setFlash,
  unwrapOption,
  waitUntilAccountGone,
} from "@/lib";
import { useOwnerTx } from "@/hooks/useOwnerTx";

export default function EstateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { address } = useLocalSearchParams<{ address: string }>();
  const { client } = useMobileWallet();
  const { rows, loading, reload, drop } = useEstates("authority");
  const { checkIn, topUpSol, reassignHeir, closeEstate, updateSettings, addToken } = useOwnerTx();
  const renameMutation = useRenameEstate();
  const [busy, setBusy] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [toast, setToast] = useState<string | undefined>(undefined);
  const { ask, prompt, notice, fail, cancel, confirm, extra } = useConfirmSheet();

  const row = rows.find((item) => item.address === address);

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
      await reload();
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

  function onAddSol(lamports: bigint) {
    prompt(
      { cap: "Add SOL", title: "Move this SOL into the estate?", confirmLabel: "Add SOL" },
      () => void runOwner("Add SOL", () => topUpSol(current.data.heir, lamports), "SOL added"),
    );
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

  function onAddAsset(mint: Address, amount: bigint) {
    prompt(
      {
        cap: "Add token",
        title: "Add this token to the estate?",
        body: "Registers a new mint. It does not top up a token already here.",
        confirmLabel: "Add token",
      },
      () => void runOwner("Add token", () => addToken(current, mint, amount), "Token added"),
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
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 16) + 40,
          gap: 30,
        }}
      >
        <EstateHero row={current} busy={checkingIn} disabled={busy} onCheckIn={onCheckIn} />

        <View style={{ gap: 14 }}>
          <Cap>In this estate</Cap>
          <EstateAssets
            claimableLamports={current.claimableLamports}
            tokenAccounts={registeredTokenCount(current.data.claimableAssets)}
            distributed={!live}
            onAddSol={onAddSol}
            adding={busy}
          />
        </View>

        <View style={{ gap: 14 }}>
          <Cap>Named on this estate</Cap>
          <EstatePeople
            heir={String(current.data.heir)}
            heartbeat={signer ?? undefined}
            guardian={guardian ?? undefined}
          />
        </View>

        {live ? (
          <View style={{ gap: 14 }}>
            <Cap>Manage</Cap>
            <EstateManage
              row={current}
              rpc={client.rpc}
              busy={busy}
              onReassign={onReassign}
              onTiming={onTiming}
              onAddAsset={onAddAsset}
              onClose={onClose}
              onRename={onRename}
            />
          </View>
        ) : null}
      </ScrollView>
      <ConfirmSheet ask={ask} onCancel={cancel} onConfirm={confirm} onExtra={extra} />
      <InkToast text={toast} />
    </View>
  );
}
