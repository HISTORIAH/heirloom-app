import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Cap, PrimaryButton } from "@/components/ui";
import { shortAddress } from "@/lib/address";
import type { EstateUiState } from "@/lib/estateState";
import type { EstateRow } from "@/lib/estates";
import { presentEstate } from "@/lib/presentEstate";
import { colors, space } from "@/theme";

interface PulseTicketProps {
  row: EstateRow;
  onBeat: (label: string, reclaim: boolean) => void;
}

function BeatMark({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12h4l2.5-5 4 10 2.5-5H21"
        stroke={colors.ink}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PulseTrace() {
  return (
    <Svg width={120} height={36} viewBox="0 0 120 36" fill="none">
      <Path
        d="M2 20h18l6-12 10 24 8-16h76"
        stroke={colors.sage}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function urgency(state: EstateUiState): {
  label: string;
  bg: string;
  fg: string;
  border: string;
} {
  if (state === "grace") {
    return {
      label: "Due now",
      bg: colors.sage,
      fg: colors.ink,
      border: colors.ink,
    };
  }
  if (state === "claimable") {
    return {
      label: "Window open",
      bg: colors.ink,
      fg: colors.white,
      border: colors.ink,
    };
  }
  if (state === "distributed") {
    return {
      label: "Ended",
      bg: colors.soft,
      fg: colors.mute,
      border: colors.line,
    };
  }
  return {
    label: "On time",
    bg: colors.soft,
    fg: colors.ink,
    border: colors.line,
  };
}

function barFill(state: EstateUiState): string {
  if (state === "grace") return colors.sage;
  if (state === "active") return colors.yellow;
  if (state === "claimable") return colors.ink;
  return colors.line;
}

/** Signer monitor — pulse track, not a gift ticket or owner status tile. */
export function PulseTicket({ row, onBeat }: PulseTicketProps) {
  const presentation = presentEstate(row.data, row.claimableLamports);
  const { state, progress, countdown, checkInTone } = presentation;
  const label = row.data.label.trim() || "Estate";
  const heir = shortAddress(String(row.data.heir));
  const live = state !== "distributed";
  const chip = urgency(state);
  const pct =
    state === "claimable"
      ? 0
      : Math.round(Math.max(0, Math.min(1, progress.ratio)) * 100);
  const fill = barFill(state);
  const beatLabel =
    state === "claimable" ? "I'm alive — reclaim" : "Send heartbeat";

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: live ? colors.ink : colors.line,
        borderRadius: space.radiusTile,
        backgroundColor: state === "grace" ? colors.soft : colors.bg,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: live ? colors.sage : colors.soft,
              borderWidth: 1,
              borderColor: live ? colors.ink : colors.line,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BeatMark />
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
              For {heir}
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

      <View style={{ paddingHorizontal: 10, paddingBottom: 4, opacity: 0.9 }}>
        <PulseTrace />
      </View>

      <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
        <View
          style={{
            height: 10,
            borderRadius: 999,
            backgroundColor: colors.line,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${pct}%`,
              height: "100%",
              backgroundColor: fill,
              borderRadius: 999,
            }}
          />
        </View>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 13,
            color: colors.mute,
          }}
        >
          {state === "active"
            ? `${countdown.days}d ${countdown.hours}h until grace`
            : state === "grace"
              ? `${countdown.days}d ${countdown.hours}h until the heir can claim`
              : progress.caption}
        </Text>

        {live ? (
          <PrimaryButton
            label={beatLabel}
            tone={state === "claimable" ? "ink" : checkInTone}
            onPress={() => onBeat(label, state === "claimable")}
          />
        ) : (
          <Text
            style={{
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 14,
              color: colors.mute,
            }}
          >
            This vault is empty. No pulse left to send.
          </Text>
        )}
      </View>
    </View>
  );
}

interface SignerHoldWellProps {
  onHold: () => void;
}

export function SignerHoldWell({ onHold }: SignerHoldWellProps) {
  return (
    <Pressable
      onPress={onHold}
      accessibilityRole="button"
      accessibilityLabel="Hold the signer card"
      style={({ pressed }) => ({
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: colors.sage,
        borderRadius: space.radiusTile,
        backgroundColor: colors.bg,
        padding: 16,
        opacity: pressed ? 0.85 : 1,
        gap: 12,
        alignItems: "center",
      })}
    >
      <View
        style={{
          width: 220,
          aspectRatio: 1.586,
          borderWidth: 1,
          borderColor: colors.ink,
          borderRadius: 10,
          backgroundColor: colors.sage,
          padding: 14,
          justifyContent: "space-between",
        }}
      >
        <BeatMark size={26} />
        <View>
          <Cap>Signer card</Cap>
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
      <PulseTrace />
      <Text
        style={{
          textAlign: "center",
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 13,
          lineHeight: 18,
          color: colors.mute,
        }}
      >
        The hot signer card only bumps the timer. It cannot empty the vault.
      </Text>
    </Pressable>
  );
}
