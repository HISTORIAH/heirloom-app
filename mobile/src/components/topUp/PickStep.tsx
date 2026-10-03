import { Pressable, ScrollView, Text, View } from "react-native";

import { TokenAvatar } from "@/components/TokenAvatar";
import { Cap, Display, IconButton, PillButton, TextLink, Toggle } from "@/components/ui";
import { SOL_ASSET_ID } from "@/constants/create";
import { shortAddress, unitsLabel, usdLabel } from "@/lib";
import { colors, font, space } from "@/theme";
import type { AssetSort } from "@/types/create";
import type { TopUpAsset } from "@/types/estate";

/** "120.00", "0.0042", "0". */
export function heldText(raw: bigint, decimals: number): string {
  if (raw === 0n) return "0";
  return unitsLabel(raw, decimals, raw < 10n ** BigInt(decimals) ? 4 : 2, 2);
}

function AssetRow({ asset, onPress }: { asset: TopUpAsset; onPress: () => void }) {
  const title = asset.named ? asset.symbol : "Unknown token";
  const sub =
    asset.named && asset.name !== asset.symbol
      ? asset.name
      : asset.mint === undefined
        ? asset.name
        : shortAddress(asset.mint);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Deposit ${title}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderWidth: space.rule,
        borderColor: colors.line,
        borderRadius: space.radiusBtn,
        backgroundColor: colors.paper,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <TokenAvatar
        image={asset.image}
        symbol={asset.symbol}
        kind="token"
        size={40}
        round
        fill={asset.id === SOL_ASSET_ID ? colors.sky : colors.line}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontFamily: font.bold, fontSize: 16, color: colors.ink }}>
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontFamily: font.regular, fontSize: 13, color: colors.mute }}
        >
          {sub}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text
          style={{
            fontFamily: font.bold,
            fontSize: 16,
            fontVariant: ["tabular-nums"],
            color: colors.ink,
          }}
        >
          {heldText(asset.held, asset.decimals)}
        </Text>
        {asset.usd !== null ? (
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 13,
              fontVariant: ["tabular-nums"],
              color: colors.mute,
            }}
          >
            {usdLabel(asset.usd)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Step 1: choose SOL or a token. Tokens already in the estate come first. */
export function PickStep({
  estateName,
  groups,
  hiddenCount,
  loading,
  hideDust,
  sort,
  onHideDust,
  onSort,
  onPick,
  onClose,
}: {
  estateName: string;
  groups: Array<{ title: string; assets: TopUpAsset[] }>;
  hiddenCount: number;
  loading: boolean;
  hideDust: boolean;
  sort: AssetSort;
  onHideDust: (next: boolean) => void;
  onSort: (next: AssetSort) => void;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Cap>{`Deposit into ${estateName}`}</Cap>
          <Display size={26}>What are you depositing?</Display>
        </View>
        <IconButton icon="close" label="Close" onPress={onClose} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Toggle on={hideDust} label="Hide dust" onPress={() => onHideDust(!hideDust)} />
        <PillButton
          label={`Sort: ${sort === "value" ? "Value" : "Name"}`}
          trailingIcon="chevronDown"
          accessibilityLabel={`Sort by ${sort}, tap to change`}
          onPress={() => onSort(sort === "value" ? "name" : "value")}
        />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {groups
          .filter((group) => group.assets.length > 0)
          .map((group, index) => (
            <View key={group.title} style={{ gap: 8, marginTop: index === 0 ? 0 : 8 }}>
              <Cap>{group.title}</Cap>
              {group.assets.map((asset) => (
                <AssetRow key={asset.id} asset={asset} onPress={() => onPick(asset.id)} />
              ))}
            </View>
          ))}
        {loading ? (
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.mute }}>
            Loading your tokens…
          </Text>
        ) : null}
        {hiddenCount > 0 ? (
          <TextLink
            label={`${hiddenCount} small ${hiddenCount === 1 ? "balance" : "balances"} hidden · show`}
            align="left"
            quiet
            flush
            onPress={() => onHideDust(false)}
          />
        ) : null}
      </ScrollView>
    </>
  );
}
