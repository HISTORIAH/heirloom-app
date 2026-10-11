import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { PrimaryButton } from "@/components/ui";
import { colors, font, space } from "@/theme";
import type { UnrecognizedAnswer } from "@/types/nfc";

function Choice({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 60,
        paddingHorizontal: 18,
        borderWidth: space.rule,
        borderColor: colors.ink,
        borderRadius: space.radiusTile,
        backgroundColor: colors.paper,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ fontFamily: font.bold, fontSize: 16, color: colors.ink }}>{label}</Text>
      <Icon name="chevronRight" size={18} weight={2.2} />
    </Pressable>
  );
}

function AnswerCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        gap: 10,
        padding: space.tile,
        borderWidth: space.rule,
        borderColor: colors.ink,
        borderRadius: space.radiusTile,
        backgroundColor: colors.paper,
      }}
    >
      <Text style={{ fontFamily: font.bold, fontSize: 16, color: colors.ink }}>{title}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.mute }}>
        {body}
      </Text>
      {children}
    </View>
  );
}

/**
 * A card we read but couldn't place: neither an Heirloom nor a Tangem card. Only shown after
 * detection fails; a Tangem holder normally never sees it.
 */
export function NotRecognized({
  answer,
  tangemSupported,
  onAnswer,
  onScanTangem,
  onConnectWallet,
}: {
  answer: UnrecognizedAnswer | undefined;
  tangemSupported: boolean;
  onAnswer: (answer: UnrecognizedAnswer) => void;
  onScanTangem: () => void;
  onConnectWallet: () => void;
}) {
  return (
    <View style={{ gap: 20 }}>
      <View accessibilityRole="header" style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.claim }} />
          <Text
            style={{
              fontFamily: font.bold,
              fontSize: 11,
              letterSpacing: 1.98,
              color: colors.claim,
            }}
          >
            NOT RECOGNIZED
          </Text>
        </View>
        <Text
          style={{
            fontFamily: font.semibold,
            fontSize: 26,
            letterSpacing: -0.9,
            color: colors.ink,
          }}
        >
          We read it, but don’t know it
        </Text>
        <Text
          style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.mute }}
        >
          Tell us what it is and we’ll try again the right way.
        </Text>
      </View>

      {answer === undefined ? (
        <View style={{ gap: 10 }}>
          {tangemSupported ? (
            <Choice label="It’s a Tangem card" onPress={() => onAnswer("tangem")} />
          ) : null}
          <Choice label="It’s something else" onPress={() => onAnswer("other")} />
        </View>
      ) : answer === "tangem" ? (
        <AnswerCard
          title="Hold your Tangem card again"
          body="Tangem will ask for the card’s access code before it signs."
        >
          <PrimaryButton label="Scan Tangem card" onPress={onScanTangem} />
        </AnswerCard>
      ) : (
        <AnswerCard
          title="We can’t read that one yet"
          body="Right now Heirloom reads Heirloom and Tangem credentials. If yours holds a Solana wallet, connect it through its wallet app instead."
        >
          <PrimaryButton tone="paper" label="Connect a wallet app" onPress={onConnectWallet} />
        </AnswerCard>
      )}
    </View>
  );
}
