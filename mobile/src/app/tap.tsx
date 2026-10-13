import type { Address } from "@solana/kit";
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
import {
  cancelScan,
  estateSpan,
  fetchEstatesByHeir,
  openNfcSettings,
  parseAddress,
  scanCardAddress,
} from "@/lib";
import {
  isTangemCancel,
  isTangemSupported,
  readTangemCredential,
  tangemProblemMessage,
} from "@/lib/nfc/tangem";
import { rememberCredential } from "@/lib/nfc/credentials";
import { NotRecognized } from "@/components/tap/NotRecognized";
import { CONNECT_ACTION } from "@/constants/ui";
import { failureLine } from "@/lib/failure";
import { isUserCancel } from "@/lib/text";
import type { UnrecognizedAnswer } from "@/types/nfc";

type TapState =
  | { kind: "searching" }
  | { kind: "off" }
  | { kind: "unsupported" }
  | { kind: "blank" }
  | { kind: "tangem" }
  | { kind: "unrecognized"; answer?: UnrecognizedAnswer }
  | { kind: "failed"; message: string };

function stateFrom(result: Exclude<CardScan, { kind: "address" | "cancelled" | "tangem" }>): TapState {
  if (result.kind === "off") return { kind: "off" };
  if (result.kind === "unsupported") return { kind: "unsupported" };
  if (result.kind === "empty") return { kind: "blank" };
  if (result.kind === "unrecognized") return { kind: "unrecognized" };
  return { kind: "failed", message: result.message };
}

function statusLine(state: TapState): string {
  if (state.kind === "searching") return "Searching…";
  if (state.kind === "off") return "NFC is off. Turn it on, then try again.";
  if (state.kind === "unsupported") return "This phone can’t read credentials.";
  if (state.kind === "blank") return "This credential is blank. Set it up for someone.";
  if (state.kind === "tangem") return "Tangem card. Follow Tangem’s prompt to read it…";
  if (state.kind === "unrecognized") return "We read it, but don’t know it.";
  return state.message;
}

function Pulse({ active }: { active: boolean }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!active) {
      pulse.set(withTiming(1, { duration: 180 }));
      return;
    }
    pulse.set(withRepeat(
      withSequence(
        withTiming(1.03, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    ));
  }, [active, pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <Animated.View style={style}>
      <TapIllustration />
    </Animated.View>
  );
}

/** Tap a credential: claim if an estate is waiting or open a PIN card as a wallet. */
export default function TapSheet() {
  const router = useRouter();
  const { account, client, connect } = useMobileWallet();
  const [state, setState] = useState<TapState>({ kind: "searching" });
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const alive = useRef(true);

  /**
   * Unlocked cards go straight to claim. Locked ones (a PIN, or Tangem's access code) are wallets:
   * claim if an estate is waiting, the card otherwise.
   */
  const openCredential = useCallback(
    async (credential: Address, locked: boolean) => {
      if (!locked) {
        router.replace(`/claim?heir=${credential}`);
        return;
      }
      try {
        const rows = await fetchEstatesByHeir(client.rpc, credential);
        const claimable = rows.some(
          (row) => estateSpan(row.data, row.claimableLamports).state === "claimable",
        );
        if (claimable) router.replace(`/claim?heir=${credential}&keep=1`);
        else router.replace(`/card?heir=${credential}`);
      } catch {
        router.replace(`/card?heir=${credential}`);
      }
    },
    [client, router],
  );

  /** Tangem cards run their own reader and sheet, so our scan is stopped while it's open. */
  const readTangem = useCallback(async () => {
    if (!isTangemSupported) {
      setState({ kind: "failed", message: "That’s a Tangem card. This build can’t read them." });
      return;
    }
    setState({ kind: "tangem" });
    try {
      const credential = await readTangemCredential();
      if (!alive.current) return;
      rememberCredential({ kind: "tangem", ...credential });
      await openCredential(credential.address, true);
    } catch (cause) {
      if (!alive.current) return;
      const message = isTangemCancel(cause)
        ? "Tangem read closed. Try again when the card is ready."
        : tangemProblemMessage(cause, "Couldn’t read the card.");
      setState({ kind: "failed", message });
    }
  }, [openCredential]);

  const scan = useCallback(async () => {
    setState({ kind: "searching" });
    const result = await scanCardAddress();
    if (!alive.current || result.kind === "cancelled") return;
    if (result.kind === "tangem") {
      await readTangem();
      return;
    }
    if (result.kind === "address") {
      const credential = parseAddress(result.value, "credential");
      rememberCredential({ kind: "heirloom", address: credential });
      await openCredential(credential, result.pin.kind !== "none");
      return;
    }
    setState(stateFrom(result));
  }, [openCredential, readTangem]);
  // Scan once on mount; a new `scan` identity must not restart (and cancel) a live session.
  const scanRef = useRef(scan);
  useEffect(() => {
    scanRef.current = scan;
  }, [scan]);

  useEffect(() => {
    alive.current = true;
    void scanRef.current();
    return () => {
      alive.current = false;
      void cancelScan();
    };
  }, []);

  /** The card holds a wallet we can't read: connect it through its own wallet app instead. */
  async function onConnectWallet() {
    try {
      await connect();
      router.replace("/");
    } catch (cause) {
      if (isUserCancel(cause)) return;
      setState({ kind: "failed", message: failureLine(cause, CONNECT_ACTION) });
    }
  }

  async function onTangem() {
    await cancelScan();
    await readTangem();
  }

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
  const reading = searching || state.kind === "tangem";

  return (
    <RouteSheet onClose={() => void cancelScan()}>
      <View style={{ gap: 16 }}>
        {state.kind === "unrecognized" ? (
          <NotRecognized
            answer={state.answer}
            tangemSupported={isTangemSupported}
            onAnswer={(answer) => setState({ kind: "unrecognized", answer })}
            onScanTangem={() => void onTangem()}
            onConnectWallet={() => void onConnectWallet()}
          />
        ) : (
          <>
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

            <Pulse active={reading} />

            <Text
              style={{ fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.mute }}
            >
              Card, ring or band - hold it near the top of the back of your phone. Keep it still for a
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
                  backgroundColor: reading
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
          </>
        )}

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
          {state.kind === "unrecognized" ? (
            <TextLink flush label="Scan again" onPress={() => void scan()} />
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
