import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { solToLamports } from "@/lib/lamports";
import { colors } from "@/theme";

interface EstateAssetsProps {
  claimableLamports: bigint;
  tokenAccounts: number;
  distributed?: boolean;
  onAddSol?: (lamports: bigint) => void;
  adding?: boolean;
}

function vaultSol(lamports: bigint): string {
  return (Number(lamports) / 1e9).toFixed(2);
}

function PlusMark() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={colors.ink}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function Figure({
  value,
  unit,
  cap,
  empty,
  ruled,
}: {
  value: string;
  unit?: string;
  cap: string;
  empty: boolean;
  ruled?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderLeftWidth: ruled ? 1 : 0,
        borderLeftColor: colors.line,
        paddingLeft: ruled ? 18 : 0,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <Text
          style={{
            fontFamily: "SpaceGrotesk_700Bold",
            fontSize: 44,
            letterSpacing: -2.2,
            lineHeight: 44,
            fontVariant: ["tabular-nums"],
            color: empty ? colors.line : colors.ink,
          }}
        >
          {value}
        </Text>
        {unit !== undefined ? (
          <Text
            style={{
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 18,
              letterSpacing: -0.2,
              marginLeft: 4,
              marginBottom: 4,
              color: empty ? colors.line : colors.ink,
            }}
          >
            {unit}
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          marginTop: 6,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 13,
          color: colors.mute,
        }}
      >
        {cap}
      </Text>
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
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  function submit() {
    try {
      const lamports = solToLamports(amount);
      if (lamports <= 0n) {
        setError("Enter an amount above 0.");
        return;
      }
      setError(undefined);
      onAddSol(lamports);
    } catch {
      setError("Enter an amount above 0.");
    }
  }

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        disabled={adding}
        accessibilityRole="button"
        accessibilityLabel="Add SOL"
        style={({ pressed }) => ({
          marginTop: 20,
          height: 50,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: colors.ink,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: adding ? 0.45 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        })}
      >
        <PlusMark />
        <Text
          style={{
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 15,
            color: colors.ink,
          }}
        >
          Add SOL
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={{ marginTop: 20, gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={amount}
          onChangeText={(value) => {
            setError(undefined);
            setAmount(value);
          }}
          placeholder="Amount in SOL"
          placeholderTextColor={colors.mute}
          keyboardType="decimal-pad"
          editable={!adding}
          accessibilityLabel="Amount in SOL"
          style={{
            flex: 1,
            minWidth: 0,
            height: 50,
            borderWidth: 1.5,
            borderColor: colors.ink,
            borderRadius: 14,
            paddingHorizontal: 14,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 16,
            fontVariant: ["tabular-nums"],
            color: colors.ink,
            backgroundColor: colors.bg,
          }}
        />
        <Pressable
          onPress={submit}
          disabled={adding}
          accessibilityRole="button"
          accessibilityLabel="Add SOL"
          style={({ pressed }) => ({
            width: 120,
            height: 50,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: colors.ink,
            backgroundColor: colors.ink,
            alignItems: "center",
            justifyContent: "center",
            opacity: adding ? 0.45 : pressed ? 0.88 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: "SpaceGrotesk_600SemiBold",
              fontSize: 15,
              color: colors.white,
            }}
          >
            {adding ? "Working…" : "Add SOL"}
          </Text>
        </Pressable>
      </View>
      {error !== undefined ? (
        <Text
          style={{
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 13,
            color: colors.claim,
          }}
        >
          {error}
        </Text>
      ) : null}
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
  const tokenCap = tokenAccounts === 1 ? "Token account" : "Token accounts";

  return (
    <View>
      <View style={{ flexDirection: "row" }}>
        <Figure
          value={hasSol ? vaultSol(claimableLamports) : "0.00"}
          unit="SOL"
          cap="Native SOL"
          empty={!hasSol}
        />
        <Figure
          value={String(tokenAccounts)}
          cap={tokenCap}
          empty={!hasTokens}
          ruled
        />
      </View>
      {onAddSol && !distributed ? (
        <AddSolRow onAddSol={onAddSol} adding={adding} />
      ) : null}
    </View>
  );
}
