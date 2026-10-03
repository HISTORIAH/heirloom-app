import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { TokenAvatar } from "@/components/TokenAvatar";
import { Cap, PillButton, TextLink } from "@/components/ui";
import { SOL_ASSET_ID } from "@/constants/create";
import { HOLDINGS_PREVIEW } from "@/constants/estate";
import { shortAddress, unitsLabel, usdLabel } from "@/lib";
import { colors, font, space } from "@/theme";
import type { EstateHolding } from "@/types/estate";

type EstateAssetsProps = {
  holdings: EstateHolding[];
  totalUsd: number | null;
  /** Tokens still loading. SOL always shows. */
  loading?: boolean;
  error?: string;
  distributed?: boolean;
  /** Opens the deposit sheet; with an id, straight on that asset's amount step. */
  onTopUp?: (id?: string) => void;
  adding?: boolean;
};

function HoldingRow({ holding, onPress }: { holding: EstateHolding; onPress?: () => void }) {
  const isSol = holding.id === SOL_ASSET_ID;
  const title = holding.named ? holding.symbol : "Unknown token";
  return (
    <Pressable
      onPress={onPress}
      disabled={onPress === undefined}
      accessibilityRole={onPress === undefined ? undefined : "button"}
      accessibilityHint={onPress === undefined ? undefined : `Deposit more ${title}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 44,
        paddingVertical: 12,
        borderTopWidth: space.rule,
        borderTopColor: colors.line,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <TokenAvatar
        image={holding.image}
        symbol={holding.symbol}
        kind="token"
        size={36}
        round
        fill={isSol ? colors.sky : colors.line}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontFamily: font.bold, fontSize: 16, color: colors.ink }}>
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontFamily: font.regular, fontSize: 13, color: colors.mute }}
        >
          {isSol || holding.mint === undefined ? "Native SOL" : shortAddress(holding.mint)}
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
          {unitsLabel(holding.amount, holding.decimals, 2, 2)}
        </Text>
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 13,
            fontVariant: ["tabular-nums"],
            color: colors.mute,
          }}
        >
          {holding.usd === null ? "—" : usdLabel(holding.usd)}
        </Text>
      </View>
    </Pressable>
  );
}

/** "In this estate": the vault's assets, most valuable first, with the deposit entry point. */
export function EstateAssets({
  holdings,
  totalUsd,
  loading,
  error,
  distributed = false,
  onTopUp,
  adding,
}: EstateAssetsProps) {
  const total = totalUsd === null ? "" : ` · ≈ ${usdLabel(totalUsd)}`;
  const topUp = distributed || adding ? undefined : onTopUp;
  const [expanded, setExpanded] = useState(false);
  // One extra row isn't worth a "Show all" tap.
  const collapsible = holdings.length > HOLDINGS_PREVIEW + 1;
  const shown = collapsible && !expanded ? holdings.slice(0, HOLDINGS_PREVIEW) : holdings;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Cap>{`In this estate${total}`}</Cap>
        {onTopUp !== undefined && !distributed ? (
          <PillButton
            label={adding ? "Working…" : "Deposit"}
            icon="plus"
            accessibilityLabel="Deposit into this estate"
            disabled={adding}
            onPress={() => onTopUp()}
          />
        ) : null}
      </View>
      <View>
        {shown.map((holding) => (
          <HoldingRow
            key={holding.id}
            holding={holding}
            onPress={topUp === undefined ? undefined : () => topUp(holding.id)}
          />
        ))}
        {collapsible ? (
          <TextLink
            label={expanded ? "Show less" : `Show all ${holdings.length}`}
            align="left"
            quiet
            flush
            onPress={() => setExpanded(!expanded)}
          />
        ) : null}
        {loading ? (
          <Text
            style={{
              paddingVertical: 12,
              borderTopWidth: space.rule,
              borderTopColor: colors.line,
              fontFamily: font.regular,
              fontSize: 13,
              color: colors.mute,
            }}
          >
            Loading tokens…
          </Text>
        ) : null}
        {error !== undefined ? (
          <Text
            style={{ paddingTop: 8, fontFamily: font.semibold, fontSize: 13, color: colors.claim }}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
