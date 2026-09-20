import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { Cap, PrimaryButton } from "@/components/ui";
import { solToLamports } from "@/lib/lamports";
import { formatSol } from "@/lib/presentEstate";
import { colors, space } from "@/theme";

interface EstateAssetsProps {
  claimableLamports: bigint;
  tokenAccounts: number;
  distributed?: boolean;
  onAddSol?: (lamports: bigint) => void;
  adding?: boolean;
}

function VaultWatermark({ lively }: { lively?: boolean }) {
  const fill = lively ? colors.sage : colors.line;
  return (
    <Svg width={120} height={120} viewBox="16 14 88 92" fill="none">
      <Rect x="16" y="14" width="21" height="92" rx="7" fill={fill} />
      <Rect x="83" y="14" width="21" height="92" rx="7" fill={fill} />
      <Path
        d="M37 60h9l7-17 14 34 7-17h9"
        fill="none"
        stroke={fill}
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LedgerRow({
  accent,
  label,
  meta,
  value,
  dimmed,
}: {
  accent: string;
  label: string;
  meta: string;
  value: string;
  dimmed?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "stretch" }}>
      <View
        style={{
          width: 4,
          borderRadius: 2,
          backgroundColor: accent,
          opacity: dimmed ? 0.35 : 1,
        }}
      />
      <View style={{ flex: 1, paddingVertical: 2 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 15,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: dimmed ? colors.mute : colors.ink,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 22,
              letterSpacing: -0.4,
              fontVariant: ["tabular-nums"],
              color: dimmed ? colors.mute : colors.ink,
            }}
          >
            {value}
          </Text>
        </View>
        <Text
          style={{
            marginTop: 8,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 13,
            lineHeight: 18,
            color: colors.mute,
          }}
        >
          {meta}
        </Text>
      </View>
    </View>
  );
}

function AddSolRow({
  onAddSol,
  adding,
}: {
  onAddSol: (lamports: bigint) => void;
  adding?: boolean;
}) {
  const [amount, setAmount] = useState("");

  function submit() {
    try {
      const lamports = solToLamports(amount);
      if (lamports <= 0n) throw new Error("Enter a SOL amount");
      onAddSol(lamports);
    } catch (cause) {
      Alert.alert("Top up", cause instanceof Error ? cause.message : "Enter a SOL amount");
    }
  }

  return (
    <View style={{ marginTop: 16, gap: 10 }}>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="SOL to add"
        placeholderTextColor={colors.mute}
        keyboardType="decimal-pad"
        style={{
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: colors.ink,
          borderRadius: space.radiusBtn,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 14,
          color: colors.ink,
          backgroundColor: colors.bg,
        }}
      />
      <PrimaryButton
        label={adding ? "Working…" : "Add SOL"}
        disabled={adding}
        onPress={submit}
      />
    </View>
  );
}
export function EstateAssets({
  claimableLamports,
  tokenAccounts,
  distributed = false,
  onAddSol,
  adding,
}: EstateAssetsProps) {
  const hasSol = claimableLamports > 0n;
  const hasTokens = tokenAccounts > 0;
  const empty = !hasSol && !hasTokens;

  const solValue = hasSol ? formatSol(claimableLamports) : "—";
  const tokenValue = hasTokens ? String(tokenAccounts) : "—";

  return (
    <View style={{ gap: 10 }}>
      <Cap>Assets</Cap>

      <View
        style={{
          borderWidth: 1,
          borderColor: empty ? colors.line : colors.ink,
          borderRadius: space.radiusTile,
          backgroundColor: empty ? colors.soft : colors.bg,
          padding: 18,
          overflow: "hidden",
          minHeight: empty ? 140 : undefined,
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: -8,
            bottom: -16,
            opacity: empty ? 0.28 : 0.4,
          }}
        >
          <VaultWatermark lively={!empty} />
        </View>

        {empty ? (
          <View style={{ gap: 8, maxWidth: "78%" }}>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_600SemiBold",
                fontSize: 18,
                letterSpacing: -0.3,
                color: colors.ink,
              }}
            >
              {distributed ? "Distributed" : "Chamber empty"}
            </Text>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 14,
                lineHeight: 20,
                color: colors.mute,
              }}
            >
              {distributed
                ? "Claim emptied this vault. Nothing left to protect."
                : "Lock SOL and token accounts here so the heir can claim them later."}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 0 }}>
            <LedgerRow
              accent={colors.yellow}
              label="SOL"
              meta={hasSol ? "Native balance in the vault PDA" : "No SOL locked"}
              value={solValue}
              dimmed={!hasSol}
            />

            <View
              style={{
                height: 1,
                backgroundColor: colors.line,
                marginVertical: 16,
                marginLeft: 16,
              }}
            />

            <LedgerRow
              accent={colors.sage}
              label="Token accounts"
              meta={
                hasTokens
                  ? "SPL accounts the heir can claim"
                  : "No token accounts locked"
              }
              value={tokenValue}
              dimmed={!hasTokens}
            />

            <View
              style={{
                marginTop: 18,
                marginLeft: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: colors.yellow,
                borderWidth: 1,
                borderColor: colors.ink,
                borderRadius: space.radiusBtn,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.ink,
                }}
              />
              <Text
                style={{
                  flex: 1,
                  fontFamily: "SpaceGrotesk_700Bold",
                  fontSize: 12,
                  letterSpacing: 0.6,
                  color: colors.ink,
                }}
              >
                Locked until claim or withdraw
              </Text>
            </View>
          </View>
        )}
      </View>

      {onAddSol && !distributed ? (
        <AddSolRow onAddSol={onAddSol} adding={adding} />
      ) : null}
    </View>
  );
}
