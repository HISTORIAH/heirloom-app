import { View } from "react-native";

import { colors } from "@/theme";

const BARS = 46;

/**
 * The check-in ruler from the redesign: a tall "today" mark, full bars for the
 * check-in window, short faded bars for the heir's wait. Days already spent
 * are ghosted.
 */
export function CheckInBars({
  intervalDays,
  graceDays,
  elapsedDays = 0,
  height = 30,
  ink = colors.ink,
}: {
  intervalDays: number;
  graceDays: number;
  elapsedDays?: number;
  height?: number;
  ink?: string;
}) {
  const total = Math.max(1, intervalDays + graceDays);
  const intervalBars = Math.max(1, Math.round((BARS * intervalDays) / total));
  const today = Math.min(BARS - 1, Math.floor((BARS * Math.max(0, elapsedDays)) / total));
  const tall = Math.round(height * 0.75);
  const short = Math.round(height * 0.4);

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height }}
    >
      {Array.from({ length: BARS }, (_, i) => {
        const grace = i >= intervalBars;
        const spent = i < today;
        return (
          <View
            key={i}
            style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, flex: 1, height }}
          >
            {i === today ? <View style={{ width: 3, height, backgroundColor: ink }} /> : null}
            <View
              style={{
                flex: 1,
                height: grace ? short : tall,
                backgroundColor: ink,
                opacity: spent ? 0.15 : grace ? 0.35 : 1,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}
