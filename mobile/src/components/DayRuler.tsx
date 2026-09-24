import { useState } from "react";
import { Text, View } from "react-native";

import { colors } from "@/theme";

const MIN_BAR = 3;

interface DayRulerProps {
  intervalDays: number;
  graceDays: number;
  elapsedDays: number;
  legendFrom: string;
  legendTo: string;
  shortLabel?: string;
  compact?: boolean;
  graceColor?: string;
  ink?: string;
}

function fitMarks(total: number, width: number): { count: number; gap: number } {
  const room = width > 0 ? width : 320;
  const preferredGap = total > 50 ? 2 : 3;
  const fits = (gap: number) => Math.floor((room + gap) / (MIN_BAR + gap));
  if (fits(preferredGap) >= total) return { count: total, gap: preferredGap };
  if (fits(1) >= total) return { count: total, gap: 1 };
  return { count: Math.max(1, fits(1)), gap: 1 };
}

function markSpan(index: number, count: number, total: number): { start: number; end: number } {
  const start = Math.floor((index * total) / count);
  const end = Math.max(start + 1, Math.floor(((index + 1) * total) / count));
  return { start, end };
}

function tickLook(
  index: number,
  count: number,
  total: number,
  intervalDays: number,
  today: number,
  compact: boolean,
  graceColor: string,
  ink: string,
): { height: number; color: string; opacity: number } {
  const { start, end } = markSpan(index, count, total);
  const now = today >= start && today < end;
  const graceDaysInMark = Math.max(0, end - Math.max(start, intervalDays));
  const grace = !now && graceDaysInMark * 2 >= end - start;
  const spent = !now && end - 1 < today;
  return {
    height: tickHeight(now, grace, compact),
    color: grace ? graceColor : ink,
    opacity: spent ? 0.18 : 1,
  };
}

function RulerCaption({
  intervalDays,
  graceDays,
  scale,
  bracket,
  ink,
}: {
  intervalDays: number;
  graceDays: number;
  scale: string;
  bracket?: string;
  ink: string;
}) {
  const graceFlex = intervalDays > 0 ? graceDays : 1;
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {intervalDays > 0 ? (
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              marginRight: 12,
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 11,
              color: ink,
              opacity: 0.6,
              paddingBottom: 2,
            }}
          >
            {scale}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {bracket !== undefined ? (
          <Text
            style={{
              flexShrink: 0,
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 11,
              color: ink,
              paddingBottom: 2,
            }}
          >
            {bracket}
          </Text>
        ) : null}
      </View>
      {graceDays > 0 ? (
        <View style={{ flexDirection: "row", marginTop: 2, height: 8 }}>
          {intervalDays > 0 ? <View style={{ flex: intervalDays }} /> : null}
          <View
            style={{
              flex: graceFlex,
              minWidth: 10,
              height: 8,
              borderTopWidth: 1.5,
              borderLeftWidth: 1.5,
              borderRightWidth: 1.5,
              borderColor: ink,
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

function tickHeight(now: boolean, grace: boolean, compact: boolean): number {
  if (compact) {
    if (now) return 28;
    if (grace) return 12;
    return 18;
  }
  if (now) return 60;
  if (grace) return 24;
  return 42;
}

export function DayRuler({
  intervalDays,
  graceDays,
  elapsedDays,
  legendFrom,
  legendTo,
  shortLabel,
  compact = false,
  graceColor = colors.ink,
  ink = colors.ink,
}: DayRulerProps) {
  const total = intervalDays + graceDays;
  const [width, setWidth] = useState(0);
  if (total < 1) return null;

  const today = Math.min(Math.max(0, elapsedDays), total - 1);
  const { count, gap } = fitMarks(total, width);
  const daysPerMark = Math.max(1, Math.round(total / count));
  const ticks = Array.from({ length: count }, (_, i) => i);
  const mark = compact ? 28 : 60;
  const bracket = shortLabel ?? (graceDays > 0 ? `${graceDays}-day grace` : undefined);
  const scale =
    daysPerMark === 1 ? "One mark per day" : `One mark per ${daysPerMark} days`;

  return (
    <View style={{ marginTop: compact ? 12 : 26 }}>
      {compact ? null : (
        <RulerCaption
          intervalDays={intervalDays}
          graceDays={graceDays}
          scale={scale}
          bracket={bracket}
          ink={ink}
        />
      )}

      <View
        onLayout={(event) => {
          const next = Math.round(event.nativeEvent.layout.width);
          setWidth((current) => (current === next ? current : next));
        }}
        style={{
          flexDirection: "row",
          height: mark,
          alignItems: "flex-end",
          gap,
        }}
      >
        {ticks.map((i) => {
          const look = tickLook(i, count, total, intervalDays, today, compact, graceColor, ink);
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: look.height,
                backgroundColor: look.color,
                borderRadius: 2,
                opacity: look.opacity,
              }}
            />
          );
        })}
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 10,
        }}
      >
        <Text
          style={{
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 12,
            color: ink,
          }}
        >
          {legendFrom}
        </Text>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 12,
            color: ink,
            textAlign: "right",
            flexShrink: 1,
          }}
        >
          {legendTo}
        </Text>
      </View>
    </View>
  );
}
