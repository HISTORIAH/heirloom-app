import { useMobileWallet } from "@wallet-ui/react-native-kit";
import * as Clipboard from "expo-clipboard";
import type { Address } from "@solana/kit";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmountSheet } from "@/components/claim/AmountSheet";
import { DestSheet } from "@/components/claim/DestSheet";
import { HoldCardSheet } from "@/components/claim/HoldCardSheet";
import { PinSheet } from "@/components/claim/PinSheet";
import { ChainLoading } from "@/components/ChainLoading";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { NfcDummyCard } from "@/components/NfcDummyCard";
import { Wordmark } from "@/components/Wordmark";
import {
  Card,
  CopyHit,
  Display,
  FactRow,
  Fine,
  IconButton,
  Pill,
  PrimaryButton,
} from "@/components/ui";
import { colors, font, space } from "@/theme";
import type { CardHolding } from "@/types/claim";
import { useCardHoldings, useConfirmSheet, useHeirTx } from "@/hooks";
import {
  bySoonest,
  cancelScan,
  cardProblemMessage,
  digitsToPinBytes,
  estateSpan,
  fetchEstatesByHeir,
  isUserCancel,
  lamportsToSolText,
  NFC_UI_SETTLE_MS,
  parseAddress,
  rawToUiText,
  setFlash,
  shortAddress,
  solToLamports,
  spareLamports,
  uiAmountToRaw,
} from "@/lib";
import { isPinEntryError } from "@/lib/nfc/apdu";

type SendPick = {
  holding: CardHolding;
  amount: bigint;
  destination?: Address;
};

function waitUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, NFC_UI_SETTLE_MS);
  });
}

function holdingLabel(h: CardHolding): string {
  return h.named ? h.symbol : "Token";
}

function holdingAmount(h: CardHolding): string {
  if (h.symbol === "SOL") return lamportsToSolText(h.amount);
  return rawToUiText(h.amount, h.decimals);
}

/** Credential wallet: balances on the chip, copy to receive, PIN-gated send. */
export default function CardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ heir?: string }>();
  const { client } = useMobileWallet();
  const { sendFromCardWallet } = useHeirTx();
  const { fail, ask, cancel, confirm, extra } = useConfirmSheet();
  const [heir, setHeir] = useState<Address | undefined>(undefined);
  const [claimable, setClaimable] = useState(false);
  const [rent, setRent] = useState(0n);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [amountOpen, setAmountOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [destError, setDestError] = useState<string | undefined>(undefined);
  const [amountError, setAmountError] = useState<string | undefined>(undefined);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinDigits, setPinDigits] = useState("");
  const [pinError, setPinError] = useState<string | undefined>(undefined);
  const [holdHint, setHoldHint] = useState(false);
  const pending = useRef<SendPick | undefined>(undefined);
  const { holdings, loading, refetch } = useCardHoldings(heir);

  useEffect(() => {
    try {
      if (params.heir !== undefined) setHeir(parseAddress(params.heir, "credential"));
    } catch {
      setHeir(undefined);
    }
  }, [params.heir]);

  const loadRoles = useCallback(async () => {
    if (heir === undefined) return;
    try {
      const rows = await fetchEstatesByHeir(client.rpc, heir);
      const next = bySoonest(rows)[0];
      setClaimable(
        next !== undefined && estateSpan(next.data, next.claimableLamports).state === "claimable",
      );
    } catch {
      setClaimable(false);
    }
  }, [client, heir]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    void client.rpc
      .getMinimumBalanceForRentExemption(0n)
      .send()
      .then((value) => setRent(BigInt(value)));
  }, [client]);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  function maxText(h: CardHolding): string {
    if (h.symbol === "SOL") return lamportsToSolText(spareLamports(h.amount, rent));
    return rawToUiText(h.amount, h.decimals);
  }

  function parseSendAmount(h: CardHolding, text: string): bigint {
    const raw = h.symbol === "SOL" ? solToLamports(text) : uiAmountToRaw(text, h.decimals);
    if (raw <= 0n) throw new Error("Enter an amount.");
    if (h.symbol === "SOL") {
      const max = spareLamports(h.amount, rent);
      if (raw > max) throw new Error("Leave enough SOL for fees.");
    } else if (raw > h.amount) {
      throw new Error("That is more than the card holds.");
    }
    return raw;
  }

  async function runSend(pick: SendPick, pin?: Uint8Array) {
    if (busy || pick.destination === undefined) return;
    setBusy(true);
    setPinOpen(false);
    setHoldHint(true);
    try {
      await waitUi();
      const asset =
        pick.holding.token !== undefined
          ? { kind: "token" as const, token: pick.holding.token, amount: pick.amount }
          : { kind: "sol" as const, lamports: pick.amount };
      await sendFromCardWallet(pick.destination, asset, pin);
      setFlash("Sent.");
      pending.current = undefined;
      setPinDigits("");
      void refetch();
    } catch (cause) {
      if (isUserCancel(cause)) return;
      if (isPinEntryError(cause)) {
        pending.current = pick;
        setPinDigits("");
        setPinError(
          cause.kind === "pin_wrong" ? cardProblemMessage(cause, "Enter the PIN.") : undefined,
        );
        setPinOpen(true);
        return;
      }
      fail("Send", new Error(cardProblemMessage(cause, "Could not send from this credential.")));
    } finally {
      setHoldHint(false);
      setBusy(false);
    }
  }

  function onAmountContinue(text: string) {
    const pick = pending.current;
    if (pick === undefined) return;
    try {
      const amount = parseSendAmount(pick.holding, text);
      pending.current = { ...pick, amount };
      setAmountError(undefined);
      setAmountOpen(false);
      setDestOpen(true);
    } catch (cause) {
      setAmountError(cause instanceof Error ? cause.message : "Enter an amount.");
    }
  }

  function onDest(dest: Address) {
    const pick = pending.current;
    if (pick === undefined || heir === undefined) return;
    if (dest === heir) {
      setDestError("Pick a wallet that isn’t this credential.");
      return;
    }
    setDestOpen(false);
    setDestError(undefined);
    pending.current = { ...pick, destination: dest };
    setPinDigits("");
    setPinError(undefined);
    setPinOpen(true);
  }

  function onPinSubmit() {
    const pick = pending.current;
    if (pick === undefined) return;
    try {
      const pin = digitsToPinBytes(pinDigits);
      void runSend(pick, pin);
    } catch (cause) {
      setPinError(cause instanceof Error ? cause.message : "Enter the PIN.");
    }
  }

  async function onCopy() {
    if (heir === undefined) return;
    await Clipboard.setStringAsync(heir);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function canSend(h: CardHolding): boolean {
    if (h.symbol === "SOL") return spareLamports(h.amount, rent) > 0n;
    return h.amount > 0n;
  }

  function startSend(h: CardHolding) {
    pending.current = { holding: h, amount: 0n };
    setAmountError(undefined);
    setAmountOpen(true);
  }

  const visible = holdings.filter((h) => h.symbol === "SOL" || h.amount > 0n);
  const sendable = visible.filter(canSend);
  const sending = pending.current;

  function onSendPress() {
    const pick = sendable.find((h) => h.symbol === "SOL") ?? sendable[0];
    if (pick === undefined) return;
    startSend(pick);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: space.pad,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ marginLeft: -12 }}>
          <Wordmark height={40} />
        </View>
        <IconButton icon="close" label="Close" onPress={close} />
      </View>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: space.pad,
          paddingTop: 16,
          paddingBottom: 24,
          gap: 14,
        }}
      >
        <NfcDummyCard stretch code={params.heir?.slice(-4)} />
        {claimable ? (
          <Pressable
            onPress={() => heir !== undefined && router.replace(`/claim?heir=${heir}&keep=1`)}
            accessibilityRole="button"
            style={({ pressed }) => ({ alignSelf: "flex-start", opacity: pressed ? 0.55 : 1 })}
          >
            <Pill dot label="An estate is claimable" fill={colors.yellow} />
          </Pressable>
        ) : (
          <View style={{ alignSelf: "flex-start" }}>
            <Pill dot label="On this card" />
          </View>
        )}
        <Display size={36}>This card is the wallet.</Display>
        <Fine>
          Hold the credential to open this. Copy the address to receive. Send asks for the PIN, then
          a hold.
        </Fine>
        {loading ? <ChainLoading compact body="Reading balances…" /> : null}
        {heir !== undefined ? (
          <Card radius={space.radiusHero} padding={0} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            <FactRow
              first
              label="Address"
              value={shortAddress(heir)}
              aside={<CopyHit text={heir} />}
            />
            {visible.map((h) => {
              const row = (
                <FactRow strong label={holdingLabel(h)} value={holdingAmount(h)} />
              );
              if (!canSend(h)) return <View key={h.id}>{row}</View>;
              return (
                <Pressable
                  key={h.id}
                  onPress={() => startSend(h)}
                  accessibilityRole="button"
                  accessibilityLabel={`Send ${holdingLabel(h)}`}
                  style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
                >
                  {row}
                </Pressable>
              );
            })}
          </Card>
        ) : (
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.claim }}>
            This credential address is not valid.
          </Text>
        )}
      </ScrollView>
      <View
        style={{
          paddingHorizontal: space.pad,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          gap: 12,
          backgroundColor: colors.bg,
        }}
      >
        <PrimaryButton
          label="Send"
          disabled={heir === undefined || sendable.length === 0 || busy}
          onPress={onSendPress}
        />
        <PrimaryButton
          tone="paper"
          icon="copy"
          label={copied ? "Copied" : "Copy address"}
          disabled={heir === undefined}
          onPress={() => void onCopy()}
        />
      </View>
      {amountOpen && sending !== undefined ? (
        <AmountSheet
          symbol={sending.holding.symbol}
          maxLabel={maxText(sending.holding)}
          error={amountError}
          busy={busy}
          onClose={() => setAmountOpen(false)}
          onMax={() => maxText(sending.holding)}
          onContinue={onAmountContinue}
        />
      ) : null}
      {destOpen ? (
        <DestSheet
          cap="Send"
          title="Send to a wallet I own"
          error={destError}
          busy={busy}
          onClose={() => setDestOpen(false)}
          onEdit={() => setDestError(undefined)}
          onSend={onDest}
        />
      ) : null}
      {pinOpen ? (
        <PinSheet
          cap="Send"
          title="Enter the PIN"
          lede="Same PIN as when this card was set up."
          digits={pinDigits}
          error={pinError}
          busy={busy}
          submitLabel="Hold to send"
          onDigit={(d) => {
            setPinError(undefined);
            setPinDigits((prev) => prev + d);
          }}
          onBackspace={() => setPinDigits((prev) => prev.slice(0, -1))}
          onSubmit={onPinSubmit}
          onCancel={() => setPinOpen(false)}
        />
      ) : null}
      {holdHint ? (
        <HoldCardSheet
          cap="Send"
          onCancel={() => {
            setHoldHint(false);
            void cancelScan();
          }}
        />
      ) : null}
      <ConfirmSheet ask={ask} onCancel={cancel} onConfirm={confirm} onExtra={extra} />
    </View>
  );
}
