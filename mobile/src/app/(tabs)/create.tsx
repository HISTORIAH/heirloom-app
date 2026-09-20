import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppHeader } from "@/components/AppHeader";
import {
  Cap,
  H2,
  Lede,
  PrimaryButton,
  Row,
  TextLink,
  Tile,
} from "@/components/ui";
import { useOwnerTx } from "@/hooks/useOwnerTx";
import { shortAddress } from "@/lib/address";
import { floatDestinations } from "@/lib/cardFloat";
import {
  CARD_FEE_FLOAT_SOL,
  DEFAULT_GRACE_DAYS,
  DEFAULT_HEARTBEAT_DAYS,
  SECONDS_PER_DAY,
} from "@/lib/constants";
import { solToLamports } from "@/lib/lamports";
import {
  parseAddress,
  parseOptionalAddress,
} from "@/lib/ownerWrites";
import { colors, space } from "@/theme";

const STEPS = ["HEIRS", "ASSETS", "HEARTBEAT", "REVIEW"] as const;
const HEARTBEAT_DAYS = DEFAULT_HEARTBEAT_DAYS;
const GRACE_DAYS = DEFAULT_GRACE_DAYS;

function Stepper({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 48,
        paddingHorizontal: 20,
      }}
    >
      <Text
        style={{
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 11,
          letterSpacing: 1.98,
          textTransform: "uppercase",
          color: colors.ink,
        }}
      >
        {STEPS[step - 1]}
      </Text>
      <Text
        style={{
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: 11,
          letterSpacing: 1.98,
          color: colors.ink,
        }}
      >
        {String(step).padStart(2, "0")} / 04
      </Text>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <Pressable
            key={i}
            onPress={() => onJump(i)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: i === step ? colors.ink : colors.line,
              backgroundColor: i === step ? colors.ink : colors.bg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 11,
                color: i === step ? colors.white : colors.ink,
              }}
            >
              {String(i).padStart(2, "0")}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Field({
  label,
  hint,
  value,
  placeholder,
  keyboardType,
  error,
  onChangeText,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  keyboardType?: "default" | "decimal-pad";
  error?: string;
  onChangeText: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const border = error ? colors.claim : focused ? colors.ink : colors.line;
  return (
    <View style={{ marginVertical: 16 }}>
      <Cap>{label}</Cap>
      {hint ? (
        <Text
          style={{
            marginTop: 4,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 13,
            lineHeight: 18,
            color: colors.mute,
          }}
        >
          {hint}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mute}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          marginTop: 8,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: border,
          borderRadius: space.radiusBtn,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 14,
          color: colors.ink,
          backgroundColor: colors.bg,
        }}
      />
      {error ? (
        <Text
          style={{
            marginTop: 8,
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 12,
            color: colors.claim,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function fail(message: string) {
  Alert.alert("Create estate", message);
}

function hasSolAmount(text: string): boolean {
  try {
    return solToLamports(text) > 0n;
  } catch {
    return false;
  }
}

export default function CreateScreen() {
  const router = useRouter();
  const { createEstate } = useOwnerTx();
  const [step, setStep] = useState(1);
  const [label, setLabel] = useState("spouse");
  const [heir, setHeir] = useState("");
  const [guardian, setGuardian] = useState("");
  const [signer, setSigner] = useState("");
  const [sol, setSol] = useState("");
  const [fundHeir, setFundHeir] = useState(false);
  const [acked, setAcked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [heirError, setHeirError] = useState<string | undefined>(undefined);
  const [guardianError, setGuardianError] = useState<string | undefined>(undefined);
  const [signerError, setSignerError] = useState<string | undefined>(undefined);

  const floatCount = useMemo(() => {
    try {
      const heirAddr = parseAddress(heir, "heir");
      const hbSigner = parseOptionalAddress(signer, "check-in signer");
      return floatDestinations({
        heir: heirAddr,
        hbSigner,
        fundHeir,
      }).length;
    } catch {
      return 0;
    }
  }, [heir, signer, fundHeir]);

  function goAssets() {
    let ok = true;
    try {
      parseAddress(heir, "heir");
      setHeirError(undefined);
    } catch (cause) {
      setHeirError(
        cause instanceof Error ? cause.message : "Enter a valid heir address.",
      );
      ok = false;
    }
    try {
      parseOptionalAddress(guardian, "guardian");
      setGuardianError(undefined);
    } catch (cause) {
      setGuardianError(cause instanceof Error ? cause.message : "Check the address");
      ok = false;
    }
    try {
      parseOptionalAddress(signer, "check-in signer");
      setSignerError(undefined);
    } catch (cause) {
      setSignerError(cause instanceof Error ? cause.message : "Check the address");
      ok = false;
    }
    if (ok) setStep(2);
  }

  async function onCreate() {
    if (!acked || busy) return;
    let amountLamports: bigint;
    try {
      amountLamports = solToLamports(sol);
      if (amountLamports <= 0n) throw new Error("Select at least some SOL to create a vault.");
      parseAddress(heir, "heir");
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : "Check the form");
      return;
    }

    setBusy(true);
    try {
      const heirAddr = parseAddress(heir, "heir");
      await createEstate({
        heir: heirAddr,
        label,
        heartbeatInterval: BigInt(HEARTBEAT_DAYS * SECONDS_PER_DAY),
        gracePeriod: BigInt(GRACE_DAYS * SECONDS_PER_DAY),
        amountLamports,
        delegate: parseOptionalAddress(guardian, "guardian"),
        hbSigner: parseOptionalAddress(signer, "check-in signer"),
        fundHeir,
      });
      Alert.alert("Estate created", "Check-in starts now. The vault is on chain.", [
        { text: "Dashboard", onPress: () => router.replace("/") },
      ]);
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : "Could not create the estate");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = acked && !busy && hasSolAmount(sol);
  const heirShort = heir.trim().length > 8 ? shortAddress(heir.trim()) : heir.trim() || "—";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <Stepper step={step} onJump={setStep} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
        {step === 1 ? (
          <>
            <Cap>01 / 04</Cap>
            <H2>Who inherits</H2>
            <Field
              label="What to call this estate"
              hint="Only you see this. Keeps estates apart."
              value={label}
              onChangeText={setLabel}
            />
            <Field
              label="Their Solana wallet address"
              hint="Paste from your heir's wallet. Assets go here only."
              value={heir}
              placeholder="Heir address"
              error={heirError}
              onChangeText={(v) => {
                setHeirError(undefined);
                setHeir(v);
              }}
            />
            <TextLink
              label="Fill from a card"
              align="left"
              onPress={() =>
                Alert.alert(
                  "Coming next",
                  "Card fill lands with the Java Card slice.",
                )
              }
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginVertical: 20,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
              <Cap>Optional</Cap>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
            </View>
            <Field
              label="Guardian"
              hint="Optional. Leave blank to skip."
              value={guardian}
              placeholder="Leave blank to skip"
              error={guardianError}
              onChangeText={(v) => {
                setGuardianError(undefined);
                setGuardian(v);
              }}
            />
            <Field
              label="Check-in signer"
              hint="Optional. Leave blank to skip."
              value={signer}
              placeholder="Leave blank to skip"
              error={signerError}
              onChangeText={(v) => {
                setSignerError(undefined);
                setSigner(v);
              }}
            />
            <PrimaryButton label="Continue" onPress={goAssets} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Cap>02 / 04</Cap>
            <H2>What goes in</H2>
            <Lede>
              Skip if you want. Review still needs some SOL — the program rejects an empty
              vault.
            </Lede>
            <Field
              label="SOL"
              value={sol}
              placeholder="0"
              keyboardType="decimal-pad"
              onChangeText={setSol}
            />
            <View style={{ marginTop: 20 }}>
              <PrimaryButton label="Continue" onPress={() => setStep(3)} />
              <TextLink label="Skip for now" onPress={() => setStep(3)} />
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Cap>03 / 04</Cap>
            <H2>When your heir inherits</H2>
            <Lede>
              {`That's ${HEARTBEAT_DAYS + GRACE_DAYS} days from today. Checking in once resets the clock.`}
            </Lede>
            <Row left="Check-in" right={`${HEARTBEAT_DAYS} days`} muteLeft />
            <Row
              left="Opens"
              right={`${HEARTBEAT_DAYS} + ${GRACE_DAYS} days`}
              muteLeft
            />
            <View style={{ marginTop: 20 }}>
              <PrimaryButton label="Continue" onPress={() => setStep(4)} />
            </View>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Cap>04 / 04</Cap>
            <H2>Check and confirm</H2>
            <Cap>If you never check in again</Cap>
            <H2 size={28}>{`${HEARTBEAT_DAYS + GRACE_DAYS} days from today`}</H2>
            <Tile paper style={{ marginTop: 16 }}>
              <Cap>Heir</Cap>
              <Row left={label.trim() || "heir"} right={heirShort} />
              <Lede>Inherits the whole estate</Lede>
            </Tile>
            <Tile style={{ marginTop: 12 }}>
              <Cap>Going into the estate</Cap>
              <Row left="SOL" right={sol.trim() || "0"} />
              {floatCount > 0 ? (
                <Row
                  left="Onto the card"
                  right={`${CARD_FEE_FLOAT_SOL} SOL${floatCount > 1 ? ` × ${floatCount}` : ""}`}
                />
              ) : null}
            </Tile>
            <Pressable
              onPress={() => setFundHeir((v) => !v)}
              style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 16 }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  marginTop: 4,
                  borderWidth: 1,
                  borderColor: colors.ink,
                  backgroundColor: fundHeir ? colors.ink : colors.bg,
                }}
              />
              <Text
                style={{
                  flex: 1,
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 16,
                  lineHeight: 24,
                  color: colors.mute,
                }}
              >
                Send {CARD_FEE_FLOAT_SOL} SOL to the heir so a card can pay claim later.
                Skip this if the heir is a software wallet.
              </Text>
            </Pressable>
            {signer.trim().length > 0 ? (
              <Text
                style={{
                  marginTop: 12,
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.mute,
                }}
              >
                The check-in signer always gets {CARD_FEE_FLOAT_SOL} SOL in this same
                transaction.
              </Text>
            ) : null}
            <Pressable
              onPress={() => setAcked((v) => !v)}
              style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 16 }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  marginTop: 4,
                  borderWidth: 1,
                  borderColor: colors.ink,
                  backgroundColor: acked ? colors.ink : colors.bg,
                }}
              />
              <Text
                style={{
                  flex: 1,
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 16,
                  lineHeight: 24,
                  color: colors.mute,
                }}
              >
                I understand that if I don't check in for {HEARTBEAT_DAYS} days, my heir is
                notified and can claim the estate {GRACE_DAYS} days after that.
              </Text>
            </Pressable>
            <View style={{ marginTop: 20 }}>
              <PrimaryButton
                label={busy ? "Working…" : "Create estate"}
                disabled={!canSubmit}
                onPress={() => void onCreate()}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
