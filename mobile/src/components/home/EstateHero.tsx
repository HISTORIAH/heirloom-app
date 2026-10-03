import { Pressable, Text, View } from "react-native";

import { CheckInBars } from "@/components/CheckInBars";
import { Icon } from "@/components/Icon";
import { Badge, PrimaryButton } from "@/components/ui";
import { useDashboardView } from "@/hooks/estate/useDashboardView";
import { colors, font, space } from "@/theme";
import { EstateUiState } from "@/types/estate";
import type { EstateRow } from "@/types/program";
import { estateName } from "@/lib";

const BADGE: Record<EstateUiState, string> = {
  active: "Active",
  grace: "In grace",
  claimable: "Claimable",
  distributed: "Claimed",
};

function heroUnit(state: EstateUiState, days: number): string {
  const word = days === 1 ? "day" : "days";
  if (state === "grace") return `${word} until your\nheir can claim`;
  if (state === "claimable") return `${word} your heir\ncould claim`;
  return `${word} to check in`;
}

/** The estate that needs you most: countdown, ruler, check-in. Fill follows state. */
export function EstateHero({
  row,
  busy,
  disabled,
  onCheckIn,
  onOpen,
}: {
  row: EstateRow;
  busy?: boolean;
  disabled?: boolean;
  onCheckIn: () => void;
  onOpen?: () => void;
}) {
  const view = useDashboardView(row.data, row.claimableLamports);
  const name = estateName(row);
  const live = view.state !== "distributed";

  return (
    <View
      accessibilityLabel={`${name}, ${BADGE[view.state]}`}
      style={{
        backgroundColor: view.slab,
        borderWidth: space.rule,
        borderColor: colors.ink,
        borderRadius: space.radiusHero,
        padding: 18,
        gap: 10,
      }}
    >
      <Pressable
        onPress={onOpen}
        disabled={onOpen === undefined}
        accessibilityRole="button"
        accessibilityHint="Opens estate details"
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          minHeight: 28,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2, flexShrink: 1 }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: font.bold, fontSize: 16, color: colors.ink, flexShrink: 1 }}
          >
            {name}
          </Text>
          {onOpen !== undefined ? <Icon name="chevronRight" size={18} weight={2.5} /> : null}
        </View>
        <Badge label={BADGE[view.state]} />
      </Pressable>

      {live ? (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
          <Text
            style={{
              fontFamily: font.semibold,
              fontSize: 88,
              lineHeight: 88,
              letterSpacing: -4,
              fontVariant: ["tabular-nums"],
              color: colors.ink,
              marginBottom: -6,
            }}
          >
            {view.days}
          </Text>
          <Text
            style={{
              flex: 1,
              paddingBottom: 6,
              fontFamily: font.bold,
              fontSize: 18,
              lineHeight: 22,
              color: colors.ink,
            }}
          >
            {heroUnit(view.state, view.days)}
          </Text>
        </View>
      ) : (
        <Text
          style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 28, color: colors.ink }}
        >
          Your heir has claimed this estate.
        </Text>
      )}

      {live ? (
        <CheckInBars
          intervalDays={view.intervalDays}
          graceDays={view.graceDays}
          elapsedDays={view.elapsedDays}
        />
      ) : null}

      {live ? (
        <PrimaryButton
          tone="ink"
          icon="check"
          label={busy ? "Confirm in wallet…" : "Check in now"}
          disabled={busy || disabled}
          onPress={onCheckIn}
        />
      ) : null}
    </View>
  );
}
