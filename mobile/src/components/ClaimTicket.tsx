import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Cap, PrimaryButton } from "@/components/ui";
import { shortAddress } from "@/lib/address";
import type { EstateUiState } from "@/lib/estateState";
import type { EstateRow } from "@/lib/estates";
import { formatSol, presentEstate } from "@/lib/presentEstate";
import { colors, space } from "@/theme";

interface ClaimTicketProps {
  row: EstateRow;
  onClaim: (label: string, owner: string) => void;
}

function GiftMark() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 12v10H4V12"
        stroke={colors.ink}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <Path d="M2 7h20v5H2z" stroke={colors.ink} strokeWidth="1.75" />
      <Path d="M12 22V7" stroke={colors.ink} strokeWidth="1.75" />
      <Path
        d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"
        stroke={colors.ink}
        strokeWidth="1.75"
      />
      <Path
        d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"
        stroke={colors.ink}
        strokeWidth="1.75"
      />
    </Svg>
  );
}

function ChipMark() {
  return (
    <View
      style={{
        width: 22,
        height: 16,
        backgroundColor: colors.yellow,
        borderRadius: 2,
      }}
    />
  );
}

function statusChip(state: EstateUiState): { label: string; fg: string; bg: string; border: string } {
  if (state === "claimable") {
    return {
      label: "Ready",
      fg: colors.ink,
      bg: colors.yellow,
      border: colors.ink,
    };
  }
  if (state === "grace") {
    return {
      label: "Waiting",
      fg: colors.ink,
      bg: colors.sage,
      border: colors.ink,
    };
  }
  if (state === "distributed") {
    return {
      label: "Claimed",
      fg: colors.mute,
      bg: colors.soft,
      border: colors.line,
    };
  }
  return {
    label: "Waiting",
    fg: colors.ink,
    bg: colors.soft,
    border: colors.line,
  };
}

/** Inheritance ticket — not a dashboard status tile. */
export function ClaimTicket({ row, onClaim }: ClaimTicketProps) {
  const presentation = presentEstate(row.data, row.claimableLamports);
  const { state, countdown } = presentation;
  const label = row.data.label.trim() || "Estate";
  const owner = shortAddress(String(row.data.authority));
  const ready = state === "claimable";
  const waiting = state === "active" || state === "grace";
  const claimed = state === "distributed";
  const chip = statusChip(state);
  const waitLine =
    state === "grace"
      ? `Opens in ${countdown.days}d ${countdown.hours}h`
      : state === "active"
        ? `Owner has ${countdown.days}d to check in`
        : ready
          ? "Window open"
          : "Already claimed";

  return (
    <View
      style={{
        borderWidth: ready ? 1.5 : 1,
        borderColor: ready ? colors.yellow : claimed ? colors.line : colors.ink,
        borderRadius: space.radiusTile,
        backgroundColor: colors.bg,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: ready ? colors.soft : colors.bg,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: claimed ? colors.soft : colors.yellow,
              borderWidth: 1,
              borderColor: claimed ? colors.line : colors.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GiftMark />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: "SpaceGrotesk_600SemiBold",
                fontSize: 18,
                letterSpacing: -0.3,
                color: colors.ink,
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                marginTop: 2,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 13,
                color: colors.mute,
              }}
            >
              From {owner}
            </Text>
          </View>
        </View>
        <View
          style={{
            borderRadius: 6,
            borderWidth: 1,
            borderColor: chip.border,
            backgroundColor: chip.bg,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: chip.fg,
            }}
          >
            {chip.label}
          </Text>
        </View>
      </View>

      <View style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Cap>SOL</Cap>
            <Text
              style={{
                marginTop: 4,
                fontFamily: "SpaceGrotesk_600SemiBold",
                fontSize: 20,
                fontVariant: ["tabular-nums"],
                color: colors.ink,
              }}
            >
              {formatSol(row.claimableLamports)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Cap>Tokens</Cap>
            <Text
              style={{
                marginTop: 4,
                fontFamily: "SpaceGrotesk_600SemiBold",
                fontSize: 20,
                fontVariant: ["tabular-nums"],
                color: colors.ink,
              }}
            >
              {row.data.claimableAssets === 0
                ? "—"
                : String(row.data.claimableAssets)}
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 13,
            color: colors.mute,
          }}
        >
          {waitLine}
        </Text>

        {ready ? (
          <PrimaryButton
            label="Claim inheritance"
            onPress={() => onClaim(label, owner)}
          />
        ) : waiting ? (
          <Text
            style={{
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 14,
              lineHeight: 20,
              color: colors.mute,
            }}
          >
            Nothing to take yet. The vault opens when the timer runs out.
          </Text>
        ) : (
          <Text
            style={{
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 14,
              color: colors.mute,
            }}
          >
            Already claimed.
          </Text>
        )}
      </View>
    </View>
  );
}

interface CardHoldWellProps {
  onHold: () => void;
}

export function CardHoldWell({ onHold }: CardHoldWellProps) {
  return (
    <Pressable
      onPress={onHold}
      accessibilityRole="button"
      accessibilityLabel="Hold the heir card to claim"
      style={({ pressed }) => ({
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: colors.ink,
        borderRadius: space.radiusTile,
        backgroundColor: colors.bg,
        padding: 16,
        opacity: pressed ? 0.85 : 1,
        gap: 12,
      })}
    >
      <View
        style={{
          alignSelf: "center",
          width: 220,
          aspectRatio: 1.586,
          borderWidth: 1,
          borderColor: colors.ink,
          borderRadius: 10,
          backgroundColor: colors.soft,
          padding: 14,
        }}
      >
        <ChipMark />
        <View style={{ marginTop: 28 }}>
          <Cap>Heir card</Cap>
          <Text
            style={{
              marginTop: 4,
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 16,
              color: colors.ink,
            }}
          >
            Hold to the phone
          </Text>
        </View>
      </View>
      <Text
        style={{
          textAlign: "center",
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 13,
          lineHeight: 18,
          color: colors.mute,
        }}
      >
        If you were handed a card, skip the wallet list and tap here.
      </Text>
    </Pressable>
  );
}
