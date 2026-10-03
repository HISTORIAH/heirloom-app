import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { Pill } from "@/components/ui";
import { colors, font, space } from "@/theme";
import { assetsLine, estateName, heirLine, statusTag } from "@/lib/estate/summary";
import { EstateRow } from "@/types/program";

export function EstateListRow({
  row,
  sub,
  onPress,
}: {
  row: EstateRow;
  sub?: string;
  onPress: () => void;
}) {
  const tag = statusTag(row);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
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
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: font.bold, fontSize: 16, color: colors.ink }}>
          {estateName(row)}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontFamily: font.regular, fontSize: 13, color: colors.mute }}
        >
          {sub ?? `${assetsLine(row)} · heir ${heirLine(row)}`}
        </Text>
      </View>
      <Pill label={tag.label} fill={tag.fill} />
      <Icon name="chevronRight" size={18} />
    </Pressable>
  );
}
