import { Pressable, Text, View } from "react-native";

import { StepHead } from "@/components/create/WizardChrome";
import { CheckBox } from "@/components/ui";
import { colors, font, space } from "@/theme";
import type { FeeLine, ReviewLine } from "@/types/create";

function U({ children }: { children: string }) {
  return <Text style={{ textDecorationLine: "underline" }}>{children}</Text>;
}

/** "If you don't check in for 90 days, plus a 30-day wait, credential ····7F2A can claim 1 SOL." */
function ReviewSentence({
  everyDays,
  waitDays,
  heir,
  assets,
}: {
  everyDays: number;
  waitDays: number;
  heir: string;
  assets: string;
}) {
  return (
    <View
      style={{
        padding: 18,
        borderRadius: space.radiusHero,
        borderWidth: space.rule,
        borderColor: colors.ink,
        backgroundColor: colors.yellow,
      }}
    >
      <Text
        style={{
          fontFamily: font.bold,
          fontSize: 22,
          lineHeight: 29,
          letterSpacing: -0.22,
          color: colors.ink,
        }}
      >
        If you don’t check in for <U>{`${everyDays} days`}</U>, plus a <U>{`${waitDays}-day`}</U>{" "}
        wait, {heir} can claim <U>{assets}</U>.
      </Text>
    </View>
  );
}

export function ReviewStep({
  everyDays,
  waitDays,
  heir,
  assets,
  lines,
  fees,
}: {
  everyDays: number;
  waitDays: number;
  heir: string;
  assets: string;
  lines: ReviewLine[];
  fees: FeeLine[];
}) {
  return (
    <View style={{ gap: 12 }}>
      <StepHead eyebrow="Step 4 · Review" />
      <ReviewSentence everyDays={everyDays} waitDays={waitDays} heir={heir} assets={assets} />
      <View>
        {lines.map((line) => (
          <View
            key={line.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 12,
              borderTopWidth: space.rule,
              borderTopColor: colors.line,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  fontFamily: font.regular,
                  fontSize: 11,
                  letterSpacing: 1.1,
                  textTransform: "uppercase",
                  color: colors.mute,
                }}
              >
                {line.label}
              </Text>
              <Text style={{ fontFamily: font.bold, fontSize: 15, color: colors.ink }}>
                {line.value}
              </Text>
            </View>
            <Pressable
              onPress={line.onEdit}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${line.label}`}
              style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 4 }}
            >
              <Text
                style={{
                  fontFamily: font.bold,
                  fontSize: 14,
                  color: colors.ink,
                  textDecorationLine: "underline",
                }}
              >
                Edit
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
      {fees.map((fee) => (
        <View
          key={fee.label}
          style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}
        >
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.mute }}>
            {fee.label}
          </Text>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              fontVariant: ["tabular-nums"],
              color: colors.mute,
            }}
          >
            {fee.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Consent sits directly above the CTA. */
export function Consent({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, minHeight: 44 }}
    >
      <CheckBox checked={on} />
      <Text
        style={{
          flex: 1,
          fontFamily: font.regular,
          fontSize: 14,
          lineHeight: 20,
          color: colors.ink,
        }}
      >
        I understand: if I miss check-in and the wait ends, my heir can claim. I can close this
        estate anytime before then.
      </Text>
    </Pressable>
  );
}
