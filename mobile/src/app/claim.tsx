import { useMobileWallet } from "@wallet-ui/react-native-kit";
import type { Address } from "@solana/kit";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChainLoading } from "@/components/ChainLoading";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { DestSheet } from "@/components/claim/DestSheet";
import { HoldCardSheet } from "@/components/claim/HoldCardSheet";
import { PinSheet } from "@/components/claim/PinSheet";
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
  TextLink,
} from "@/components/ui";
import { colors, font, space } from "@/theme";
import type { CardClaimPlan } from "@/types/claim";
import type { EstateHolding } from "@/types/estate";
import type { EstateRow, EstateRpc } from "@/types/program";
import { useConfirmSheet, useEstateHoldings, useHeirTx } from "@/hooks";
import {
  bySoonest,
  cancelScan,
  cardHasSweepable,
  cardProblemMessage,
  digitsToPinBytes,
  estateSpan,
  fetchEstateByAddress,
  fetchEstatesByHeir,
  isUserCancel,
  lamportsToSolText,
  NFC_UI_SETTLE_MS,
  parseAddress,
  rawToUiText,
  setFlash,
  shortAddress,
} from "@/lib";
import { isPinEntryError } from "@/lib/nfc/apdu";
import { resolveCardClaimPlan } from "@/lib/tx/cardClaim";

type Load =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "error"; message: string }
  | { kind: "found"; row: EstateRow };

type Leftover = "idle" | "checking" | "none" | "some";

function useLeftoverOnCard(rpc: EstateRpc, heir: Address | undefined, active: boolean): Leftover {
  const [leftover, setLeftover] = useState<Leftover>("idle");
  useEffect(() => {
    if (!active || heir === undefined) {
      setLeftover("idle");
      return;
    }
    let cancelled = false;
    setLeftover("checking");
    void cardHasSweepable(rpc, heir)
      .then((some) => {
        if (!cancelled) setLeftover(some ? "some" : "none");
      })
      .catch(() => {
        if (!cancelled) setLeftover("none");
      });
    return () => {
      cancelled = true;
    };
  }, [rpc, heir, active]);
  return leftover;
}

function claimHeadline(finishing: boolean, viaCredential: boolean, claimable: boolean): string {
  if (finishing) return "This card still holds assets.";
  if (viaCredential) return "This card can claim an estate.";
  if (claimable) return "You can claim this estate.";
  return "You’re named as heir.";
}

function claimFine(finishing: boolean, viaCredential: boolean, keep: boolean): string {
  if (finishing) {
    return "Hold the card to send what’s left. A little SOL stays on it so a retry can pay its fee.";
  }
  if (keep) return "The estate pays this card. After this, the assets stay on it.";
  if (viaCredential) return "Fees are already covered by the card. You’ll tap it once more to sign.";
  return "0.75% is taken from the estate when you claim.";
}

function cardSendLabel(busy: boolean, leftover: Leftover): string {
  if (busy) return "Hold still…";
  if (leftover === "some") return "Hold to finish sending";
  return "Claim to this wallet";
}

function credentialHeir(raw: string | undefined): Address | undefined {
  if (raw === undefined) return undefined;
  try {
    return parseAddress(raw, "credential");
  } catch {
    return undefined;
  }
}

function alreadyClaimedFine(pinKnown: boolean, leftover: Leftover): string {
  if (pinKnown || leftover === "some") return "What’s on the card is in its own wallet now.";
  return "This estate has already been claimed.";
}

function leftoverPending(leftover: Leftover, active: boolean): boolean {
  return active && (leftover === "idle" || leftover === "checking");
}

function AlreadyClaimed({ fine }: { fine?: string }) {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignSelf: "flex-start" }}>
        <Pill dot label="Already claimed" />
      </View>
      <Display size={36}>This estate has been claimed.</Display>
      {fine !== undefined ? <Fine>{fine}</Fine> : null}
    </View>
  );
}

function holdingLabel(h: EstateHolding): string {
  return h.named ? h.symbol : "Token";
}

function holdingAmount(h: EstateHolding): string {
  if (h.symbol === "SOL") return lamportsToSolText(h.amount);
  return rawToUiText(h.amount, h.decimals);
}

function ClaimAssetCard({ from, holdings }: { from: string; holdings: EstateHolding[] }) {
  const rows = holdings.filter((h) => h.symbol === "SOL" || h.amount > 0n);
  return (
    <Card radius={space.radiusHero} padding={0} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
      <FactRow
        first
        label="From"
        value={shortAddress(from)}
        aside={<CopyHit text={from} label="Copy owner address" />}
      />
      {rows.map((h) => (
        <FactRow key={h.id} strong label={holdingLabel(h)} value={holdingAmount(h)} />
      ))}
    </Card>
  );
}

function claimPill(finishing: boolean, claimable: boolean, daysUntilClaim: number): string {
  if (finishing) return "Claimed — finish sending";
  if (claimable) return "Claimable now";
  return `Opens in ${daysUntilClaim} days`;
}

function waitUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, NFC_UI_SETTLE_MS);
  });
}

/**
 * The heir's view of one estate. Reached by tapping a credential (`?heir=`)
 * or from Home when this wallet is named as heir (`?estate=`).
 */
export default function ClaimScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ heir?: string; estate?: string; keep?: string }>();
  const { account, client, connect } = useMobileWallet();
  const { claimAll, claimWithCard } = useHeirTx();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [destError, setDestError] = useState<string | undefined>(undefined);
  const [holdHint, setHoldHint] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinDigits, setPinDigits] = useState("");
  const [pinError, setPinError] = useState<string | undefined>(undefined);
  const pending = useRef<{ row: EstateRow; plan: CardClaimPlan; cashOut: boolean } | undefined>(
    undefined,
  );
  const { ask, fail, cancel, confirm, extra } = useConfirmSheet();
  const viaCredential = params.heir !== undefined;
  const keepHint = params.keep === "1";
  const [pinKnown, setPinKnown] = useState(keepHint);

  const fetchRow = useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      let row: EstateRow | undefined;
      if (params.estate !== undefined) {
        row = await fetchEstateByAddress(client.rpc, parseAddress(params.estate, "estate"));
      } else if (params.heir !== undefined) {
        const rows = await fetchEstatesByHeir(client.rpc, parseAddress(params.heir, "credential"));
        row = bySoonest(rows)[0];
      }
      setLoad(row === undefined ? { kind: "none" } : { kind: "found", row });
    } catch (cause) {
      setLoad({
        kind: "error",
        message: cause instanceof Error ? cause.message : "Could not load",
      });
    }
  }, [client, params.estate, params.heir]);

  useEffect(() => {
    void fetchRow();
  }, [fetchRow]);

  const found = load.kind === "found" ? load.row : undefined;
  const { holdings } = useEstateHoldings(found);
  const leftover = useLeftoverOnCard(
    client.rpc,
    viaCredential ? found?.data.heir : undefined,
    viaCredential &&
      !pinKnown &&
      found !== undefined &&
      estateSpan(found.data, found.claimableLamports).state === "distributed",
  );

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  function openCard(heir: Address) {
    router.replace(`/card?heir=${heir}`);
  }

  function onWalletClaim(row: EstateRow) {
    if (busy) return;
    setBusy(true);
    void (async () => {
      try {
        await claimAll(row);
        setFlash("Claimed. The assets are in this wallet.");
        close();
      } catch (cause) {
        fail("Claim", cause);
      } finally {
        setBusy(false);
      }
    })();
  }

  async function runPlan(row: EstateRow, plan: CardClaimPlan, pin?: Uint8Array, cashOut = false) {
    if (busy) return;
    pending.current = { row, plan, cashOut };
    setBusy(true);
    setPinOpen(false);
    setHoldHint(true);
    try {
      await waitUi();
      const result = await claimWithCard(row, plan, pin, cashOut);
      if (result === "home") {
        setPinKnown(true);
        setFlash("This card is the wallet.");
        openCard(row.data.heir);
        return;
      }
      if (result === "keep") {
        setPinKnown(true);
        setFlash("Claimed. The assets are on this card.");
        openCard(row.data.heir);
        return;
      }
      setFlash("Claimed. The assets are on their way.");
      close();
    } catch (cause) {
      if (isUserCancel(cause)) return;
      if (isPinEntryError(cause)) {
        recoverPinEntry(row, plan, cashOut, cause);
        return;
      }
      fail("Claim", new Error(cardProblemMessage(cause, "Could not send from this credential.")));
      void fetchRow();
    } finally {
      setHoldHint(false);
      setBusy(false);
    }
  }

  function recoverPinEntry(
    row: EstateRow,
    plan: CardClaimPlan,
    cashOut: boolean,
    cause: { kind: "pin_required" | "pin_wrong" },
  ) {
    setPinKnown(true);
    const skipClaim = estateSpan(row.data, row.claimableLamports).state === "distributed";
    const next = resolveCardClaimPlan({
      pin: { kind: "set", triesLeft: 3 },
      plan,
      skipClaim,
      cashOut,
    });
    if (next.kind === "home") {
      openCard(row.data.heir);
      return;
    }
    pending.current = { row, plan: next, cashOut };
    setPinDigits("");
    setPinError(cause.kind === "pin_wrong" ? cardProblemMessage(cause, "Enter the PIN.") : undefined);
    setPinOpen(true);
  }

  function askPinThen(row: EstateRow, plan: CardClaimPlan, cashOut: boolean) {
    pending.current = { row, plan, cashOut };
    setPinDigits("");
    setPinError(undefined);
    setPinOpen(true);
  }

  function startCardTx(row: EstateRow, plan: CardClaimPlan, cashOut = false) {
    if (busy) return;
    pending.current = { row, plan, cashOut };
    if (pinKnown || plan.kind === "keep") {
      askPinThen(row, plan, cashOut);
      return;
    }
    void runPlan(row, plan, undefined, cashOut);
  }

  function onWalletSend(row: EstateRow) {
    if (busy) return;
    setDestOpen(false);
    void (async () => {
      try {
        const dest = account?.address ?? (await connect()).address;
        if (dest === row.data.heir) {
          fail("Claim", new Error("Pick a wallet that isn’t this credential."));
          return;
        }
        startCardTx(row, { kind: "sweep", destination: dest });
      } catch (cause) {
        if (!isUserCancel(cause)) fail("Claim", cause);
      }
    })();
  }

  function onPastedSend(row: EstateRow, dest: Address) {
    if (dest === row.data.heir) {
      setDestError("Pick a wallet that isn’t this credential.");
      return;
    }
    setDestOpen(false);
    setDestError(undefined);
    startCardTx(row, { kind: "sweep", destination: dest }, true);
  }

  function onPinSubmit() {
    const next = pending.current;
    if (next === undefined) return;
    try {
      const pin = digitsToPinBytes(pinDigits);
      void runPlan(next.row, next.plan, pin, next.cashOut);
    } catch (cause) {
      setPinError(cause instanceof Error ? cause.message : "Enter the PIN.");
    }
  }

  let body;
  let footer: ReactNode | undefined;
  if (load.kind === "loading") {
    body = <ChainLoading compact body="Checking what it can claim…" />;
  } else if (load.kind === "error") {
    body = (
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.claim }}>
          {load.message}
        </Text>
        <TextLink align="left" label="Try again" onPress={() => void fetchRow()} />
      </View>
    );
  } else if (load.kind === "none") {
    const heir = credentialHeir(params.heir);
    body = (
      <View style={{ gap: 14 }}>
        <View style={{ alignSelf: "flex-start" }}>
          <Pill dot label="Nothing linked" />
        </View>
        <Display size={36}>
          {viaCredential ? "This card isn’t linked to an estate." : "No estate here."}
        </Display>
        <Fine>If someone set it up for you, they may not have finished yet.</Fine>
      </View>
    );
    if (heir !== undefined) {
      footer = <PrimaryButton label="Open this card" onPress={() => openCard(heir)} />;
    }
  } else {
    const row = load.row;
    const span = estateSpan(row.data, row.claimableLamports);
    const claimable = span.state === "claimable";
    const walletIsHeir = account?.address === row.data.heir;
    const hidden = viaCredential && !claimable && span.state !== "distributed";
    const leftoverActive = viaCredential && !pinKnown && span.state === "distributed";
    const waitingLeftover = leftoverPending(leftover, leftoverActive);
    const finishing = leftover === "some" && !pinKnown;
    const showKeep = viaCredential && pinKnown && claimable;
    const showSweep = viaCredential && !pinKnown && (claimable || leftover === "some");

    if (span.state === "distributed" && !finishing) {
      if (waitingLeftover) {
        body = <ChainLoading compact body="Checking what’s still on the card…" />;
      } else {
        body = (
          <AlreadyClaimed fine={viaCredential ? alreadyClaimedFine(pinKnown, leftover) : undefined} />
        );
        if (viaCredential) {
          footer = (
            <PrimaryButton label="Open this card" onPress={() => openCard(row.data.heir)} />
          );
        }
      }
    } else if (hidden) {
      body = (
        <View style={{ gap: 14 }}>
          <View style={{ alignSelf: "flex-start" }}>
            <Pill dot label="Not yet" />
          </View>
          <Display size={36}>Nothing to claim yet.</Display>
          <Fine>Keep it somewhere safe. If the time comes, tap it again.</Fine>
        </View>
      );
      footer = (
        <PrimaryButton label="Open this card" onPress={() => openCard(row.data.heir)} />
      );
    } else {
      body = (
        <View style={{ gap: 14 }}>
          <View style={{ alignSelf: "flex-start" }}>
            <Pill
              dot
              label={claimPill(finishing, claimable, span.daysUntilClaim)}
              fill={claimable || finishing ? colors.yellow : colors.paper}
            />
          </View>
          <Display size={36}>{claimHeadline(finishing, viaCredential, claimable)}</Display>
          {finishing ? null : (
            <ClaimAssetCard from={String(row.data.authority)} holdings={holdings} />
          )}
          <Fine>{claimFine(finishing, viaCredential, pinKnown)}</Fine>
        </View>
      );
    }

    if (showKeep) {
      footer = (
        <>
          <PrimaryButton
            icon="tap"
            label={busy ? "Hold still…" : "Claim to this card"}
            disabled={busy}
            onPress={() => startCardTx(row, { kind: "keep" })}
          />
          <PrimaryButton
            tone="paper"
            label="Send to a wallet I own"
            disabled={busy}
            onPress={() => {
              setDestError(undefined);
              setDestOpen(true);
            }}
          />
        </>
      );
    } else if (showSweep) {
      footer = (
        <>
          <PrimaryButton
            icon="tap"
            label={cardSendLabel(busy, leftover)}
            disabled={busy}
            onPress={() => onWalletSend(row)}
          />
          {leftover === "some" ? (
            <PrimaryButton
              tone="paper"
              label="Open this card"
              disabled={busy}
              onPress={() => openCard(row.data.heir)}
            />
          ) : null}
          <PrimaryButton
            tone="paper"
            label="Send to a wallet I own"
            disabled={busy}
            onPress={() => {
              setDestError(undefined);
              setDestOpen(true);
            }}
          />
        </>
      );
    } else if (claimable && !viaCredential) {
      footer = walletIsHeir ? (
        <PrimaryButton
          icon="check"
          label={busy ? "Confirm in wallet…" : "Claim to this wallet"}
          disabled={busy}
          onPress={() => onWalletClaim(row)}
        />
      ) : (
        <Fine center>Connect the heir wallet to claim.</Fine>
      );
    }
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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: space.pad,
          paddingTop: 16,
          paddingBottom: 24,
          gap: 14,
        }}
      >
        {viaCredential ? <NfcDummyCard stretch code={params.heir?.slice(-4)} /> : null}
        {body}
      </ScrollView>
      {footer !== undefined ? (
        <View
          style={{
            paddingHorizontal: space.pad,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            gap: 12,
            backgroundColor: colors.bg,
          }}
        >
          {footer}
        </View>
      ) : null}
      {destOpen && found !== undefined ? (
        <DestSheet
          error={destError}
          busy={busy}
          onClose={() => {
            setDestOpen(false);
            setDestError(undefined);
          }}
          onEdit={() => setDestError(undefined)}
          onSend={(dest) => onPastedSend(found, dest)}
        />
      ) : null}
      {pinOpen ? (
        <PinSheet
          cap="Claim"
          title="Enter the PIN"
          lede="The owner set this when they made the card. It is not stored on this phone."
          digits={pinDigits}
          error={pinError}
          busy={busy}
          submitLabel="Hold to sign"
          onDigit={(d) => {
            setPinError(undefined);
            setPinDigits((prev) => prev + d);
          }}
          onBackspace={() => setPinDigits((prev) => prev.slice(0, -1))}
          onSubmit={onPinSubmit}
          onCancel={() => {
            setPinOpen(false);
            pending.current = undefined;
          }}
        />
      ) : null}
      {holdHint ? (
        <HoldCardSheet
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
