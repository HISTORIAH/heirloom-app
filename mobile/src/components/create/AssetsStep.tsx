import { useRef } from "react";
import { Text, TextInput, View } from "react-native";

import { PercentRow } from "@/components/create/Chips";
import { Cap, H2, TextLink } from "@/components/ui";
import { colors, space } from "@/theme";

export function AssetsStep({
  sol,
  solError,
  hero,
  selectedPct,
  chipsDisabled,
  showClear,
  balanceLine,
  disconnected,
  onChangeSol,
  onPickPct,
  onClear,
  onConnect,
  onLift,
}: {
  sol: string;
  solError?: string;
  hero: string;
  selectedPct?: number;
  chipsDisabled: boolean;
  showClear: boolean;
  balanceLine?: string;
  disconnected: boolean;
  onChangeSol: (v: string) => void;
  onPickPct: (pct: number) => void;
  onClear: () => void;
  onConnect: () => void;
  onLift?: (node: View) => void;
}) {
  const box = useRef<View>(null);
  return (
    <View>
      <H2>What goes in</H2>
      <View style={{ marginTop: 20 }}>
        <Cap>Going into the estate</Cap>
        <H2 size={28}>{hero}</H2>
      </View>

      <View style={{ marginTop: 24 }}>
        <Cap>SOL</Cap>
        <View ref={box} collapsable={false}>
        <TextInput
          value={sol}
          onChangeText={onChangeSol}
          onFocus={() => {
            const node = box.current;
            if (node === null || node === undefined) return;
            onLift?.(node);
          }}
          placeholder="0"
          placeholderTextColor={colors.mute}
          keyboardType="decimal-pad"
          autoCorrect={false}
          style={{
            marginTop: 8,
            paddingVertical: 16,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: solError ? colors.claim : colors.line,
            borderRadius: space.radiusBtn,
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 28,
            lineHeight: 34,
            color: colors.ink,
            textAlign: "center",
            fontVariant: ["tabular-nums"],
            backgroundColor: colors.bg,
          }}
        />
        </View>
        <PercentRow
          selected={selectedPct}
          disabled={chipsDisabled}
          onPick={onPickPct}
        />
        {showClear ? (
          <TextLink label="Clear" quiet flush align="left" onPress={onClear} />
        ) : null}
        {solError ? (
          <Text
            style={{
              marginTop: 8,
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 12,
              color: colors.claim,
            }}
          >
            {solError}
          </Text>
        ) : null}
        {balanceLine ? (
          <Text
            style={{
              marginTop: 12,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 13,
              color: colors.mute,
            }}
          >
            {balanceLine}
          </Text>
        ) : null}
        {disconnected ? (
          <TextLink
            label="Connect wallet to fill from your balance"
            quiet
            align="left"
            onPress={onConnect}
          />
        ) : null}
      </View>
    </View>
  );
}
