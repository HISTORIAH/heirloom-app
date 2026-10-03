import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useMemo, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmountStep } from "@/components/topUp/AmountStep";
import { PickStep } from "@/components/topUp/PickStep";
import { useSolBalance, useWalletTokens } from "@/hooks";
import { estateName } from "@/lib";
import { isDust, sortTopUpAssets, topUpAssets } from "@/lib/estate/topUp";
import { colors, space } from "@/theme";
import type { AssetSort } from "@/types/create";
import type { EstateHolding, TopUpPick } from "@/types/estate";
import type { EstateRow } from "@/types/program";

/**
 * Deposit SOL or a token into an estate: pick an asset, then an amount on a keypad.
 * A token already in the estate is topped up; a new one is registered (opened) first.
 * `startAt` opens straight on the amount step for that asset id.
 */
export function TopUpSheet({
  row,
  holdings,
  startAt,
  onClose,
  onSubmit,
}: {
  row: EstateRow;
  holdings: EstateHolding[];
  startAt?: string;
  onClose: () => void;
  onSubmit: (pick: TopUpPick) => void;
}) {
  const insets = useSafeAreaInsets();
  const { account } = useMobileWallet();
  const { lamports } = useSolBalance();
  const wallet = useWalletTokens(account?.address);
  const [picked, setPicked] = useState<string | undefined>(startAt);
  const [hideDust, setHideDust] = useState(true);
  const [sort, setSort] = useState<AssetSort>("value");

  const assets = useMemo(
    () => topUpAssets(lamports ?? 0n, wallet.tokens, holdings),
    [lamports, wallet.tokens, holdings],
  );
  const shown = sortTopUpAssets(
    assets.filter((asset) => !hideDust || !isDust(asset)),
    sort,
  );
  const groups = [
    { title: "In this estate", assets: shown.filter((item) => item.registered) },
    { title: "New to this estate", assets: shown.filter((item) => !item.registered) },
  ];
  const asset = assets.find((item) => item.id === picked);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityLabel="Close"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim }}
      />
      <View
        accessibilityViewIsModal
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          top: Math.max(insets.top, 12) + 56,
          backgroundColor: colors.bg,
          borderTopWidth: space.rule,
          borderColor: colors.ink,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 10,
          paddingHorizontal: space.pad,
          paddingBottom: Math.max(insets.bottom, 16) + 12,
          gap: 12,
        }}
      >
        <View
          style={{
            alignSelf: "center",
            width: 44,
            height: 5,
            borderRadius: 3,
            backgroundColor: colors.quiet,
          }}
        />
        {asset !== undefined ? (
          <AmountStep
            key={asset.id}
            asset={asset}
            onBack={() => setPicked(undefined)}
            onSubmit={(amount) => onSubmit({ asset, amount })}
          />
        ) : (
          <PickStep
            estateName={estateName(row)}
            groups={groups}
            hiddenCount={assets.length - shown.length}
            loading={wallet.loading}
            hideDust={hideDust}
            sort={sort}
            onHideDust={setHideDust}
            onSort={setSort}
            onPick={setPicked}
            onClose={onClose}
          />
        )}
      </View>
    </Modal>
  );
}
