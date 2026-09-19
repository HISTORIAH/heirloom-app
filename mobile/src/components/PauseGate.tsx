import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Cap, PrimaryButton } from "@/components/ui";
import { shortAddress } from "@/lib/address";
import { formatDuration } from "@/lib/estateState";
import type { EstateRow } from "@/lib/estates";
import { presentEstate } from "@/lib/presentEstate";
import { colors, space } from "@/theme";

export type GateKind = "holdable" | "unset" | "holding" | "spent" | "late" | "ended";

interface PauseGateProps {
  row: EstateRow;
  onDefer: (label: string, duration: string) => void;
}

function ShieldMark({
  size = 28,
  stroke = colors.ink,
}: {
  size?: number;
  stroke?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.2l6 2.2v5.1c0 3.7-2.4 6.9-6 8.2-3.6-1.3-6-4.5-6-8.2V5.4L12 3.2z"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function gateKind(row: EstateRow): GateKind {
  const { state } = presentEstate(row.data, row.claimableLamports);
  const now = Math.floor(Date.now() / 1000);
  const pausedUntil = Number(row.data.pausedUntil);
  const pauseDuration = Number(row.data.pauseDuration);
  if (state === "distributed") return "ended";
  if (pausedUntil > now) return "holding";
  if (state === "claimable") return "late";
  if (pausedUntil > 0) return "spent";
  if (pauseDuration <= 0) return "unset";
  return "holdable";
}

function chipFor(
  kind: GateKind,
  grace: boolean,
): { label: string; bg: string; fg: string; border: string } {
  if (kind === "holdable" && grace) {
    return { label: "Hold now", bg: colors.ink, fg: colors.white, border: colors.ink };
  }
  if (kind === "holdable") {
    return { label: "Can hold", bg: colors.soft, fg: colors.ink, border: colors.ink };
  }
  if (kind === "unset") {
    return { label: "No length", bg: colors.soft, fg: colors.mute, border: colors.line };
  }
  if (kind === "holding") {
    return { label: "Holding", bg: colors.ink, fg: colors.white, border: colors.ink };
  }
  if (kind === "spent") {
    return { label: "Used", bg: colors.soft, fg: colors.mute, border: colors.line };
  }
  if (kind === "late") {
    return { label: "Too late", bg: colors.soft, fg: colors.mute, border: colors.line };
  }
  return { label: "Ended", bg: colors.soft, fg: colors.mute, border: colors.line };
}

function gateCopy(kind: GateKind): string {
  if (kind === "holdable") {
    return "One pause. Pushes the claim window out by this amount. You cannot claim or check in.";
  }
  if (kind === "unset") {
    return "The owner has not set a pause length. You cannot hold until they do.";
  }
  if (kind === "holding") {
    return "This pause is already live. It can only be used once until a heartbeat clears it.";
  }
  if (kind === "spent") {
    return "This pause already ran. A heartbeat must clear it before you can hold again.";
  }
  if (kind === "late") {
    return "The heir can already claim. A guardian pause cannot start now.";
  }
  return "This vault is empty. Nothing left to hold.";
}

/** Horizontal latch — not a pulse bar and not a gift header. */
export function LatchRail({
  kind,
}: {
  kind: GateKind;
}) {
  const live = kind === "holdable" || kind === "holding";
  const closed = kind === "holding";
  const bar = live ? colors.ink : colors.line;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          flex: 1,
          height: closed ? 8 : 2,
          backgroundColor: bar,
          borderRadius: 2,
        }}
      />
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: bar,
          backgroundColor: closed ? colors.ink : live ? colors.soft : colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ShieldMark size={20} stroke={closed ? colors.white : bar} />
      </View>
      <View
        style={{
          flex: 1,
          height: closed ? 8 : 2,
          backgroundColor: bar,
          borderRadius: 2,
        }}
      />
    </View>
  );
}

function heroText(kind: GateKind, holdLeft: number, duration: string): string {
  if (kind === "holding") return formatDuration(holdLeft);
  if (kind === "unset") return "Not set";
  return duration;
}

function heroCap(kind: GateKind): string {
  return kind === "holding" ? "Pause left" : "Pause length";
}

/** Guardian pause chamber — a latch, not a gift ticket or pulse monitor. */
export function PauseGate({ row, onDefer }: PauseGateProps) {
  const kind = gateKind(row);
  const { state } = presentEstate(row.data, row.claimableLamports);
  const grace = state === "grace";
  const label = row.data.label.trim() || "Estate";
  const heir = shortAddress(String(row.data.heir));
  const pauseSecs = Math.max(0, Number(row.data.pauseDuration));
  const duration = formatDuration(pauseSecs);
  const now = Math.floor(Date.now() / 1000);
  const holdLeft = Math.max(0, Number(row.data.pausedUntil) - now);
  const chip = chipFor(kind, grace);
  const live = kind === "holdable" || kind === "holding";
  const urgent = kind === "holdable" && grace;

  return (
    <View
      style={{
        borderWidth: urgent ? 1.5 : 1,
        borderColor: live ? colors.ink : colors.line,
        borderRadius: space.radiusTile,
        backgroundColor: kind === "holdable" ? colors.soft : colors.bg,
        overflow: "hidden",
        padding: 16,
        gap: 14,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
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
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 13,
              color: colors.mute,
            }}
          >
            For {heir}
          </Text>
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

      <LatchRail kind={kind} />

      <View>
        <Cap>{heroCap(kind)}</Cap>
        <Text
          style={{
            marginTop: 4,
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 34,
            letterSpacing: -1,
            color: live ? colors.ink : colors.mute,
          }}
        >
          {heroText(kind, holdLeft, duration)}
        </Text>
      </View>

      <Text
        style={{
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 14,
          lineHeight: 20,
          color: colors.mute,
        }}
      >
        {gateCopy(kind)}
      </Text>

      {kind === "holdable" ? (
        <PrimaryButton
          label="Hold the window"
          tone="ink"
          onPress={() => onDefer(label, duration)}
        />
      ) : null}
    </View>
  );
}
