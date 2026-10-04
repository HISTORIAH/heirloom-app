import { memo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { ErrorLine, StepHead } from "@/components/create/WizardChrome";
import { Icon } from "@/components/Icon";
import { TokenAvatar } from "@/components/TokenAvatar";
import { Cap, PillButton, Toggle } from "@/components/ui";
import { colors, font, space } from "@/theme";
import type { AssetOption, AssetSort, AssetTab } from "@/types/create";

const TABS: Array<{ key: AssetTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "tokens", label: "Tokens" },
  { key: "nfts", label: "NFTs" },
];

function usdText(usd: number | null): string {
  if (usd === null) return "—";
  if (usd > 0 && usd < 0.01) return "<$0.01";
  return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function sortAssets(list: AssetOption[], sort: AssetSort): AssetOption[] {
  return [...list].sort((a, b) => {
    if (a.kind === "sol") return -1;
    if (b.kind === "sol") return 1;
    if (sort === "name") return a.symbol.localeCompare(b.symbol);
    if (a.usd !== null && b.usd !== null) return b.usd - a.usd;
    if (a.usd !== null) return -1;
    if (b.usd !== null) return 1;
    return b.balanceRaw - a.balanceRaw;
  });
}

function Segmented({ tab, onTab }: { tab: AssetTab; onTab: (tab: AssetTab) => void }) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        gap: 4,
        padding: 4,
        borderRadius: space.radiusBtn,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: colors.paper,
      }}
    >
      {TABS.map((t) => {
        const on = tab === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onTab(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: on ? colors.ink : "transparent",
            }}
          >
            <Text
              style={{ fontFamily: font.bold, fontSize: 14, color: on ? colors.bg : colors.ink }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const TokenRow = memo(function TokenRow({
  asset,
  amount,
  error,
  onToggle,
  onAmount,
  onMax,
}: {
  asset: AssetOption;
  amount?: string;
  error?: string;
  onToggle: () => void;
  onAmount: (next: string) => void;
  onMax: () => void;
}) {
  const checked = amount !== undefined;
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${checked ? "Remove" : "Add"} ${asset.symbol}`}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: space.radiusBtn,
        borderWidth: space.rule,
        borderColor: checked ? colors.ink : colors.line,
        backgroundColor: checked ? colors.paper : "transparent",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TokenAvatar
          image={asset.image}
          symbol={asset.symbol}
          kind={asset.kind}
          checked={checked}
        />
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 16, color: colors.ink }}>
            {asset.symbol}
          </Text>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 13,
              fontVariant: ["tabular-nums"],
              color: colors.mute,
            }}
          >
            {asset.balance}
          </Text>
        </View>
        {asset.usd !== null ? (
          <Text
            style={{
              fontFamily: font.semibold,
              fontSize: 14,
              fontVariant: ["tabular-nums"],
              color: colors.ink,
            }}
          >
            {usdText(asset.usd)}
          </Text>
        ) : null}
      </View>
      {checked ? (
        <View style={{ marginTop: 10, gap: 6 }} onStartShouldSetResponder={() => true}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                height: 44,
                paddingHorizontal: 12,
                borderRadius: space.radiusBtn,
                borderWidth: space.rule,
                borderColor: error ? colors.claim : colors.ink,
                backgroundColor: colors.bg,
              }}
            >
              <TextInput
                value={amount}
                onChangeText={onAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.mute}
                accessibilityLabel={`Amount of ${asset.symbol}`}
                style={{
                  flex: 1,
                  padding: 0,
                  fontFamily: font.bold,
                  fontSize: 17,
                  fontVariant: ["tabular-nums"],
                  color: colors.ink,
                }}
              />
              <Text style={{ fontFamily: font.bold, fontSize: 12, color: colors.ink }}>
                {asset.symbol}
              </Text>
            </View>
            <Pressable
              onPress={onMax}
              accessibilityRole="button"
              accessibilityLabel={`Use all ${asset.symbol}`}
              style={({ pressed }) => ({
                height: 44,
                paddingHorizontal: 10,
                borderRadius: space.radiusBtn,
                borderWidth: space.rule,
                borderColor: colors.ink,
                backgroundColor: colors.paper,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.ink }}>MAX</Text>
            </Pressable>
          </View>
          <ErrorLine>{error}</ErrorLine>
        </View>
      ) : null}
    </Pressable>
  );
});

function NftTile({ asset, on, onPress }: { asset: AssetOption; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={asset.unsupported}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: asset.unsupported }}
      accessibilityLabel={`${on ? "Remove" : "Add"} collectible ${asset.name}`}
      style={{
        flex: 1,
        gap: 6,
        padding: 6,
        borderRadius: space.radiusBtn,
        borderWidth: space.rule,
        borderColor: on ? colors.ink : colors.line,
        backgroundColor: on ? colors.paper : "transparent",
        opacity: asset.unsupported ? 0.4 : 1,
      }}
    >
      <View
        style={{
          aspectRatio: 1,
          borderRadius: 8,
          borderWidth: space.rule,
          borderColor: colors.ink,
          backgroundColor: colors.sage,
        }}
      />
      <Text numberOfLines={1} style={{ fontFamily: font.bold, fontSize: 12, color: colors.ink }}>
        {asset.name}
      </Text>
      {on ? (
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: space.rule,
            borderColor: colors.ink,
            backgroundColor: colors.yellow,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="check" size={12} weight={3.5} />
        </View>
      ) : null}
    </Pressable>
  );
}

function rowsOf<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export function AssetsStep({
  assets,
  amounts,
  errors,
  tab,
  sort,
  hideDust,
  onTab,
  onSort,
  onHideDust,
  onToggle,
  onAmount,
  onMax,
}: {
  assets: AssetOption[];
  /** Selected asset id → amount text. Absent means not selected. */
  amounts: Record<string, string>;
  errors: Record<string, string | undefined>;
  tab: AssetTab;
  sort: AssetSort;
  hideDust: boolean;
  onTab: (tab: AssetTab) => void;
  onSort: (sort: AssetSort) => void;
  onHideDust: (on: boolean) => void;
  onToggle: (id: string) => void;
  onAmount: (id: string, next: string) => void;
  onMax: (id: string) => void;
}) {
  const fungible = sortAssets(
    assets.filter((a) => (tab === "tokens" ? a.kind === "token" : a.kind !== "nft")),
    sort,
  );
  const shown = fungible.filter((a) => !hideDust || !a.dust || amounts[a.id] !== undefined);
  const hidden = fungible.length - shown.length;
  const nfts = assets.filter((a) => a.kind === "nft");
  const showTokens = tab !== "nfts";
  const showNfts = tab !== "tokens";

  return (
    <View style={{ gap: 12 }}>
      <StepHead eyebrow="Step 2 · Assets" title="What goes in?" />
      <Segmented tab={tab} onTab={onTab} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Toggle on={hideDust} label="Hide dust" onPress={() => onHideDust(!hideDust)} />
        <PillButton
          label={`Sort: ${sort === "value" ? "Value" : "Name"}`}
          trailingIcon="chevronDown"
          accessibilityLabel={`Sort by ${sort}, tap to change`}
          onPress={() => onSort(sort === "value" ? "name" : "value")}
        />
      </View>

      {showTokens ? (
        <View style={{ gap: 10 }}>
          {shown.map((item) => (
            <View key={item.id} style={{ marginBottom: 10 }}>
              <TokenRow
                asset={item}
                amount={amounts[item.id]}
                error={errors[item.id]}
                onToggle={() => onToggle(item.id)}
                onAmount={(next) => onAmount(item.id, next)}
                onMax={() => onMax(item.id)}
              />
            </View>
          ))}
          {hidden > 0 ? (
            <Pressable
              onPress={() => onHideDust(false)}
              accessibilityRole="button"
              style={{ height: 36, justifyContent: "center", paddingHorizontal: 4 }}
            >
              <Text
                style={{
                  fontFamily: font.regular,
                  fontSize: 13,
                  color: colors.mute,
                  textDecorationLine: "underline",
                }}
              >
                {hidden} small {hidden === 1 ? "balance" : "balances"} hidden · show
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showNfts ? (
        <View style={{ gap: 10 }}>
          {tab === "all" ? <Cap>Collectibles</Cap> : null}
          {nfts.length > 0 ? (
            <View style={{ gap: 8 }}>
              {rowsOf(nfts, 3).map((row) => (
                <View key={row.map((n) => n.id).join()} style={{ flexDirection: "row", gap: 8 }}>
                  {row.map((asset) => (
                    <NftTile
                      key={asset.id}
                      asset={asset}
                      on={amounts[asset.id] !== undefined}
                      onPress={() => onToggle(asset.id)}
                    />
                  ))}
                  {Array.from({ length: 3 - row.length }, (_, i) => (
                    <View key={`pad-${i}`} style={{ flex: 1 }} />
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.mute }}>
              No collectibles to add yet.
            </Text>
          )}
          <Text
            style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.mute }}
          >
            Metaplex Core assets in this wallet can’t go into an estate yet.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
