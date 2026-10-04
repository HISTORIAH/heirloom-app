import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { RouteSheet } from "@/components/Sheet";
import { TapIllustration } from "@/components/TapIllustration";
import { PrimaryButton, TextField, TextLink } from "@/components/ui";
import { colors, font, space } from "@/theme";
import { CardScan } from "@/types/nfc";
import { cancelScan, openNfcSettings, parseAddress, scanCardAddress } from "@/lib";

type TapState =
  | { kind: "searching" }
  | { kind: "off" }
  | { kind: "unsupported" }
  | { kind: "blank" }
  | { kind: "failed"; message: string };

function stateFrom(result: Exclude<CardScan, { kind: "address" | "cancelled" }>): TapState {
  if (result.kind === "off") return { kind: "off" };
  if (result.kind === "unsupported") return { kind: "unsupported" };
  if (result.kind === "empty") return { kind: "blank" };
  return { kind: "failed", message: result.message };
}

function statusLine(state: TapState): string {
  if (state.kind === "searching") return "Searching…";
  if (state.kind === "off") return "NFC is off. Turn it on, then try again.";
  if (state.kind === "unsupported") return "This phone can’t read credentials.";
  if (state.kind === "blank") return "This credential is blank. Set it up for someone.";
  return state.message;
}

function Pulse({ active }: { active: boolean }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!active) {
      pulse.value = withTiming(1, { duration: 180 });
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [active, pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <Animated.View style={style}>
      <TapIllustration />
    </Animated.View>
  );
}

/** Tap a credential: an heir's to see what it can claim, or a blank one to set up. */
export default function TapSheet() {
  const router = useRouter();
  const { account } = useMobileWallet();
  const [state, setState] = useState<TapState>({ kind: "searching" });
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const alive = useRef(true);

  const scan = useCallback(async () => {
    setState({ kind: "searching" });
    const result = await scanCardAddress();
    if (!alive.current || result.kind === "cancelled") return;
    if (result.kind === "address") {
      router.replace(`/claim?heir=${result.value}`);
      return;
    }
    setState(stateFrom(result));
  }, [router]);

  useEffect(() => {
    alive.current = true;
    void scan();
    return () => {
      alive.current = false;
      void cancelScan();
    };
  }, [scan]);

  function onCode() {
    try {
      const heir = parseAddress(code, "code");
      setCodeError(undefined);
      void cancelScan();
      router.replace(`/claim?heir=${heir}`);
    } catch {
      setCodeError("We couldn’t match that code. Check it and try again.");
    }
  }

  const searching = state.kind === "searching";

  return (
    <RouteSheet onClose={() => void cancelScan()}>
      <View style={{ gap: 16 }}>
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: font.semibold,
            fontSize: 28,
            letterSpacing: -0.98,
            color: colors.ink,
          }}
        >
          Hold it to your phone
        </Text>

        <Pulse active={searching} />

        <Text
          style={{ fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.mute }}
        >
          Card, ring or band — hold it near the top of the back of your phone. Keep it still for a
          second.
        </Text>

        <View
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: space.radiusBtn,
            borderWidth: space.rule,
            borderColor: colors.ink,
            backgroundColor: colors.paper,
          }}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              borderWidth: space.rule,
              borderColor: colors.ink,
              backgroundColor: searching
                ? colors.yellow
                : state.kind === "failed"
                  ? colors.claim
                  : colors.paper,
            }}
          />
          <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 15, color: colors.ink }}>
            {statusLine(state)}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: font.regular, fontSize: 14, color: colors.mute }}>
            <Text style={{ fontFamily: font.bold, color: colors.ink }}>Heir credential</Text> — see
            what it can claim
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 14, color: colors.mute }}>
            <Text style={{ fontFamily: font.bold, color: colors.ink }}>New credential</Text> — set
            it up for someone
          </Text>
        </View>

        {codeOpen ? (
          <View style={{ gap: 8 }}>
            <TextField
              value={code}
              onChangeText={(next) => {
                setCode(next);
                setCodeError(undefined);
              }}
              placeholder="Code printed on it"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Credential code"
              error={codeError !== undefined}
            />
            {codeError !== undefined ? (
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.claim }}>
                {codeError}
              </Text>
            ) : null}
            <PrimaryButton
              tone="ink"
              label="Look it up"
              disabled={code.trim().length === 0}
              onPress={onCode}
            />
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          {state.kind === "off" ? (
            <PrimaryButton label="Open NFC settings" onPress={() => void openNfcSettings()} />
          ) : null}
          {state.kind === "blank" && account ? (
            <PrimaryButton
              label="Set it up for someone"
              onPress={() => router.replace("/create?heir=credential")}
            />
          ) : null}
          {state.kind === "failed" || state.kind === "blank" ? (
            <PrimaryButton tone="paper" label="Try again" onPress={() => void scan()} />
          ) : null}
          {searching ? (
            <PrimaryButton tone="paper" label="Cancel" onPress={() => router.back()} />
          ) : null}
        </View>
        {codeOpen ? null : (
          <TextLink
            flush
            label="Can’t scan? Enter the code printed on it"
            onPress={() => setCodeOpen(true)}
          />
        )}
      </View>
    </RouteSheet>
  );
}
