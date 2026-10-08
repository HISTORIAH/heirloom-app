import { Pressable, Text, View } from "react-native";

import { CheckInBars } from "@/components/CheckInBars";
import { HeroCountdown } from "@/components/home/HeroCountdown";
import { Icon } from "@/components/Icon";
import { Badge, PrimaryButton } from "@/components/ui";
import { useDashboardView } from "@/hooks/estate/useDashboardView";
import { colors, font, space } from "@/theme";
import type { EstateUiState } from "@/types/estate";
import type { EstateRow } from "@/types/program";
import { estateName, ownerCountdownCaption } from "@/lib";

const BADGE: Record<EstateUiState, string> = {
  active: "Active",
  grace: "In grace",
  claimable: "Claimable",
  distributed: "Claimed",
};

/**
 * The estate that needs you most: countdown, ruler, check-in. Fill follows state.
 * `compact` is the estate-detail cut: the screen header already names the estate, so the
 * top line shows the cadence instead, the count is smaller and the ruler goes.
 */
export function EstateHero({
  row,
  busy,
  disabled,
  onCheckIn,
  onOpen,
  compact,
}: {
  row: EstateRow;
  busy?: boolean;
  disabled?: boolean;
  onCheckIn: () => void;
  onOpen?: () => void;
  compact?: boolean;
}) {
  const view = useDashboardView(row.data, row.claimableLamports);
  const name = estateName(row);
  const live = view.state !== "distributed";
  const topLine = compact ? `Every ${view.intervalDays} days · ${view.graceDays}-day wait` : name;

  return (
    <View
      accessibilityLabel={`${name}, ${BADGE[view.state]}`}
      style={{
        backgroundColor: view.slab,
        borderWidth: space.rule,
        borderColor: colors.ink,
        borderRadius: space.radiusHero,
        paddingVertical: compact ? 16 : 18,
        paddingHorizontal: 18,
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
            style={{
              fontFamily: font.bold,
              fontSize: compact ? 13 : 16,
              color: colors.ink,
              flexShrink: 1,
            }}
          >
            {topLine}
          </Text>
          {onOpen !== undefined ? <Icon name="chevronRight" size={18} weight={2.5} /> : null}
        </View>
        <Badge label={BADGE[view.state]} />
      </Pressable>

      {live ? (
        <HeroCountdown
          value={view.countdown.value}
          caption={ownerCountdownCaption(view.state, view.countdown)}
          compact={compact}
        />
      ) : (
        <Text
          style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 28, color: colors.ink }}
        >
          Your heir has claimed this estate.
        </Text>
      )}

      {live && !compact ? (
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
