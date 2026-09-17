import { useRouter } from "expo-router";
import { useState } from "react";
import {
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
import { colors, space } from "@/theme";

const STEPS = ["HEIRS", "ASSETS", "HEARTBEAT", "REVIEW"] as const;

function Stepper({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 48,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
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
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
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
  onChangeText,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={{ marginVertical: 16 }}>
      <Cap>{label}</Cap>
      {hint ? (
        <Text
          style={{
            marginTop: 4,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 16,
            lineHeight: 24,
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
        style={{
          marginTop: 8,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: space.radiusBtn,
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 14,
          color: colors.ink,
          backgroundColor: colors.bg,
        }}
      />
    </View>
  );
}

function PctRow({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
      {["25%", "50%", "75%", "Max"].map((p) => {
        const on = p === selected;
        return (
          <Pressable
            key={p}
            onPress={() => onSelect(p)}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: on ? colors.ink : colors.line,
              backgroundColor: on ? colors.ink : colors.bg,
              borderRadius: space.radiusBtn,
              paddingVertical: 8,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 11,
                letterSpacing: 1,
                color: on ? colors.white : colors.ink,
              }}
            >
              {p}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function CreateScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [label, setLabel] = useState("spouse");
  const [heir, setHeir] = useState("");
  const [guardian, setGuardian] = useState("");
  const [signer, setSigner] = useState("");
  const [sol, setSol] = useState("2.50");
  const [usdc, setUsdc] = useState("400.00");
  const [solPct, setSolPct] = useState("Max");
  const [usdcPct, setUsdcPct] = useState("50%");
  const [acked, setAcked] = useState(true);

  function onCreate() {
    if (!acked) return;
    router.replace("/");
  }

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
              hint="Only you see this. It keeps estates apart on your dashboard."
              value={label}
              onChangeText={setLabel}
            />
            <Field
              label="Their Solana wallet address"
              hint="Paste it from your heir's wallet. Assets go here and nowhere else."
              value={heir}
              placeholder="Heir address"
              onChangeText={setHeir}
            />
            <TextLink label="Fill from a card" align="left" onPress={() => undefined} />
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
              value={guardian}
              placeholder="Leave blank to skip"
              onChangeText={setGuardian}
            />
            <Field
              label="Check-in signer"
              value={signer}
              placeholder="Leave blank to skip"
              onChangeText={setSigner}
            />
            <PrimaryButton label="Continue" onPress={() => setStep(2)} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Cap>02 / 04</Cap>
            <H2>What goes in</H2>
            <Lede>You can skip this and deposit from your dashboard whenever you like.</Lede>
            <Field label="SOL" value={sol} onChangeText={setSol} />
            <PctRow selected={solPct} onSelect={setSolPct} />
            <Field label="USDC" value={usdc} onChangeText={setUsdc} />
            <PctRow selected={usdcPct} onSelect={setUsdcPct} />
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
              That's 120 days from today. Drag either marker to move it — checking in once
              resets the clock.
            </Lede>
            <View
              style={{
                height: 2,
                backgroundColor: colors.line,
                marginTop: 28,
                marginBottom: 8,
                marginHorizontal: 4,
                position: "relative",
              }}
            >
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  top: -5,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: colors.ink,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  right: "22%",
                  top: -5,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: colors.yellow,
                }}
              />
            </View>
            <Row left="Check-in" right="90 days" muteLeft />
            <Row left="Opens" right="90 + 30 days" muteLeft />
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
            <H2 size={28}>120 days from today</H2>
            <View
              style={{
                height: 2,
                backgroundColor: colors.line,
                marginTop: 8,
                marginBottom: 8,
                marginHorizontal: 4,
              }}
            >
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  top: -5,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: colors.ink,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  right: "22%",
                  top: -5,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: colors.yellow,
                }}
              />
            </View>
            <Tile paper style={{ marginTop: 16 }}>
              <Cap>Heir</Cap>
              <Row left={label || "heir"} right={heir ? heir.slice(0, 4) + "…" + heir.slice(-4) : "—"} />
              <Lede>Inherits the whole estate</Lede>
            </Tile>
            <Tile style={{ marginTop: 12 }}>
              <Cap>Going into the estate</Cap>
              <Row left="SOL" right={sol || "0"} />
              <Row left="USDC" right={usdc || "0"} />
              <Row left="Onto the card" right="0.02 SOL" />
            </Tile>
            <Text
              style={{
                marginTop: 16,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 16,
                lineHeight: 24,
                color: colors.mute,
              }}
            >
              That 0.02 SOL is in this same transaction so the card can pay claim later.
              Skip it if the heir is a software wallet.
            </Text>
            <Pressable
              onPress={() => setAcked((v) => !v)}
              style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 8 }}
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
                I understand that if I don't check in for 90 days, my heir is notified and
                can claim the estate 30 days after that.
              </Text>
            </Pressable>
            <View style={{ marginTop: 20 }}>
              <PrimaryButton
                label="Create estate"
                disabled={!acked}
                onPress={onCreate}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
