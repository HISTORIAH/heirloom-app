import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { DashboardHeader } from "@/components/DashboardHeader";
import { DayRuler } from "@/components/DayRuler";
import { HoldCheckIn } from "@/components/HoldCheckIn";
import { StateSlab } from "@/components/StateSlab";
import type { DashboardView } from "@/lib/presentDashboard";
import { colors } from "@/theme";

export function EstateName({
  label,
  cadence,
}: {
  label: string;
  cadence?: string;
}) {
  return (
    <View
      style={{
        marginTop: 12,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 34,
          color: colors.ink,
        }}
      >
        {label}
      </Text>
      {cadence !== undefined ? (
        <>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 14,
              color: colors.ink,
            }}
          >
            ·
          </Text>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 14,
              color: colors.ink,
            }}
          >
            {cadence}
          </Text>
        </>
      ) : null}
    </View>
  );
}

interface EstateSlabProps {
  view: DashboardView;
  label: string;
  switcher?: ReactNode;
  busy?: boolean;
  disabled?: boolean;
  onCheckIn?: () => void;
  onHoldingChange?: (holding: boolean) => void;
}

export function EstateSlab({
  view,
  label,
  switcher,
  busy,
  disabled,
  onCheckIn,
  onHoldingChange,
}: EstateSlabProps) {
  const live = view.state !== "distributed";

  return (
    <StateSlab
      color={view.slab}
      underStatusBar
      eyebrow={view.eyebrow}
      value={String(view.days)}
      unit={view.unit}
      advice={view.advice}
      leading={
        <>
          <DashboardHeader />
          {switcher}
          <EstateName
            label={label}
            cadence={`Check in every ${view.intervalDays} days`}
          />
        </>
      }
    >
      {live ? (
        <DayRuler
          key={`${view.intervalDays}-${view.graceDays}`}
          intervalDays={view.intervalDays}
          graceDays={view.graceDays}
          elapsedDays={view.elapsedDays}
          legendFrom={view.legendFrom}
          legendTo={view.legendTo}
        />
      ) : null}
      {live && onCheckIn ? (
        <HoldCheckIn
          label={view.hold}
          busy={busy}
          disabled={disabled}
          onComplete={onCheckIn}
          onHoldingChange={onHoldingChange}
        />
      ) : null}
    </StateSlab>
  );
}
