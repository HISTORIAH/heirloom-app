import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { heldText } from "@/components/topUp/PickStep";
import { TokenAvatar } from "@/components/TokenAvatar";
import { IconButton, PrimaryButton, ToggleChip } from "@/components/ui";
import { SOL_ASSET_ID } from "@/constants/create";
import { TOP_UP_QUICK_PERCENTS, TOP_UP_QUICK_PLACES } from "@/constants/estate";
import {
  NETWORK_FEE_LAMPORTS,
  TOKEN_OPEN_RENT_LAMPORTS,
  TOP_UP_FEE_RESERVE_LAMPORTS,
} from "@/constants/fees";
import { lamportsToSolText, rawToUiText, solLabel, uiAmountToRaw, unitsLabel } from "@/lib";
import { colors, font, space } from "@/theme";
import type { TopUpAsset } from "@/types/estate";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;
type Key = (typeof KEYS)[number];

function keyLabel(key: Key): string {
  if (key === "del") return "Delete";
  if (key === ".") return "Decimal point";
  return key;
}

/** Applies one keypad press. Returns the old text when the press would be invalid. */
function press(text: string, key: Key, decimals: number): string {
  if (key === "del") return text.length > 1 ? text.slice(0, -1) : "0";
  if (key === ".") return decimals === 0 || text.includes(".") ? text : `${text}.`;
  const next = text === "0" ? key : text + key;
  const frac = next.split(".")[1] ?? "";
  if (frac.length > decimals || next.replace(".", "").length > 15) return text;
  return next;
}

function truncate(raw: bigint, decimals: number): bigint {
  if (decimals <= TOP_UP_QUICK_PLACES) return raw;
  const step = 10n ** BigInt(decimals - TOP_UP_QUICK_PLACES);
  return raw - (raw % step);
}

function parse(text: string, decimals: number): bigint {
  try {
    return uiAmountToRaw(text, decimals);
  } catch {
    return 0n;
  }
}

function SummaryRow({ label, value, ruled }: { label: string; value: string; ruled?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderTopWidth: ruled ? space.rule : 0,
        borderTopColor: colors.line,
      }}
    >
      <Text style={{ fontFamily: font.regular, fontSize: 14, color: colors.mute }}>{label}</Text>
      <Text
        style={{
          fontFamily: font.bold,
          fontSize: 14,
          fontVariant: ["tabular-nums"],
          color: colors.ink,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/** Step 2: how much, on a keypad. */
export function AmountStep({
  asset,
  onBack,
  onSubmit,
}: {
  asset: TopUpAsset;
  onBack: () => void;
  onSubmit: (amount: bigint) => void;
}) {
  const [text, setText] = useState("0");
  const isSol = asset.id === SOL_ASSET_ID;
  const title = asset.named ? asset.symbol : "Unknown token";
  // SOL keeps enough back to pay for this transaction.
  const reserve = isSol ? TOP_UP_FEE_RESERVE_LAMPORTS : 0n;
  const spendable = asset.held > reserve ? asset.held - reserve : 0n;

  const amount = parse(text, asset.decimals);
  const over = amount > spendable;
  const ok = amount > 0n && !over;
  const big = text.length > 7 ? 44 : 64;
  const heldLine = `${heldText(asset.held, asset.decimals)} ${asset.symbol}`;

  function quick(percent: number | "max") {
    const raw =
      percent === "max"
        ? isSol
          ? truncate(spendable, asset.decimals)
          : spendable
        : truncate((asset.held * BigInt(percent)) / 100n, asset.decimals);
    setText(rawToUiText(raw > spendable ? spendable : raw, asset.decimals));
  }

  function blockedLabel(): string {
    if (!over) return "Enter an amount";
    return amount > asset.held ? `Not enough ${asset.symbol}` : "Leave some SOL for the fee";
  }

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton icon="chevronLeft" label="Back to assets" onPress={onBack} />
        <TokenAvatar
          image={asset.image}
          symbol={asset.symbol}
          kind="token"
          size={30}
          round
          fill={isSol ? colors.sky : colors.line}
        />
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={{ flex: 1, fontFamily: font.bold, fontSize: 20, color: colors.ink }}
        >
          {`Deposit ${title}`}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 8,
            paddingTop: 6,
          }}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              flexShrink: 1,
              fontFamily: font.semibold,
              fontSize: big,
              lineHeight: big,
              letterSpacing: big * -0.045,
              fontVariant: ["tabular-nums"],
              color: over ? colors.claim : colors.ink,
            }}
          >
            {text}
          </Text>
          <Text style={{ fontFamily: font.bold, fontSize: 22, color: colors.mute }}>
            {asset.symbol}
          </Text>
        </View>
        <Text
          style={{
            textAlign: "center",
            fontFamily: over ? font.bold : font.regular,
            fontSize: 14,
            color: over ? colors.claim : colors.mute,
          }}
        >
          {amount > asset.held ? `More than you hold (${heldLine})` : `You hold ${heldLine}`}
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {TOP_UP_QUICK_PERCENTS.map((percent) => (
            <View key={percent} style={{ flex: 1 }}>
              <ToggleChip label={`${percent}%`} on={false} onPress={() => quick(percent)} />
            </View>
          ))}
          <View style={{ flex: 1 }}>
            <ToggleChip label="MAX" on={false} onPress={() => quick("max")} />
          </View>
        </View>

        <View
          style={{
            paddingVertical: 4,
            paddingHorizontal: 14,
            borderWidth: space.rule,
            borderColor: colors.line,
            borderRadius: space.radiusBtn,
            backgroundColor: colors.paper,
          }}
        >
          <SummaryRow
            label="Estate after"
            value={`${unitsLabel(asset.inEstate + amount, asset.decimals, 4, 2)} ${asset.symbol}`}
          />
          {asset.registered ? null : (
            <SummaryRow
              label="Opening this token"
              value={`≈ ${solLabel(TOKEN_OPEN_RENT_LAMPORTS)}`}
              ruled
            />
          )}
          <SummaryRow
            label="Network fee"
            value={`≈ ${lamportsToSolText(NETWORK_FEE_LAMPORTS)} SOL`}
            ruled
          />
        </View>

        <View accessibilityLabel="Keypad" style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 6 }}>
          {KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => setText((cur) => press(cur, key, asset.decimals))}
              onLongPress={key === "del" ? () => setText("0") : undefined}
              accessibilityRole="button"
              accessibilityLabel={keyLabel(key)}
              style={({ pressed }) => ({
                width: "33.333%",
                height: 50,
                borderRadius: space.radiusBtn,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? colors.line : "transparent",
              })}
            >
              <Text style={{ fontFamily: font.semibold, fontSize: 24, color: colors.ink }}>
                {key === "del" ? "⌫" : key}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <PrimaryButton
        label={ok ? `Deposit ${text} ${asset.symbol}` : blockedLabel()}
        disabled={!ok}
        onPress={() => onSubmit(amount)}
      />
    </>
  );
}
