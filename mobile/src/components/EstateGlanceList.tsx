import { Text, View } from "react-native";

import { Cap } from "@/components/ui";
import { shortAddress } from "@/lib/address";
import type { EstateRow } from "@/lib/estates";
import { presentEstate } from "@/lib/presentEstate";
import { colors, space } from "@/theme";

interface EstateGlanceListProps {
  rows: EstateRow[];
  empty: string;
}

/** Compact secondary list — keeps Cap/H2/lede + CTA as the first viewport. */
export function EstateGlanceList({ rows, empty }: EstateGlanceListProps) {
  if (rows.length === 0) {
    return (
      <Text
        style={{
          marginTop: 12,
          fontFamily: "SpaceGrotesk_500Medium",
          color: colors.mute,
        }}
      >
        {empty}
      </Text>
    );
  }

  return (
    <View style={{ marginTop: 12, gap: 8 }}>
      {rows.map((row) => {
        const label = row.data.label.trim() || shortAddress(String(row.address));
        const { statusLabel, stripMeta } = presentEstate(
          row.data,
          row.claimableLamports,
        );
        return (
          <View
            key={row.address}
            style={{
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: space.radiusTile,
              padding: 14,
              backgroundColor: colors.soft,
            }}
          >
            <Text
              style={{
                fontFamily: "SpaceGrotesk_600SemiBold",
                fontSize: 16,
                color: colors.ink,
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 13,
                color: colors.mute,
              }}
            >
              {shortAddress(String(row.address))} · {statusLabel}
            </Text>
            <View style={{ marginTop: 6 }}>
              <Cap>{stripMeta}</Cap>
            </View>
          </View>
        );
      })}
    </View>
  );
}
