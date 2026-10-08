import { useMobileWallet } from "@wallet-ui/react-native-kit";
import type { Address } from "@solana/kit";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChainLoading } from "@/components/ChainLoading";
import { ConfirmSheet, useConfirmSheet } from "@/components/ConfirmSheet";
import { DestSheet } from "@/components/claim/DestSheet";
import { HoldCardSheet } from "@/components/claim/HoldCardSheet";
import { NfcDummyCard } from "@/components/NfcDummyCard";
import { Wordmark } from "@/components/Wordmark";
import {
  Card,
  Display,
  FactRow,
  Fine,
  IconButton,
  Pill,
  PrimaryButton,
  TextLink,
} from "@/components/ui";
import { colors, font, space } from "@/theme";
import type { EstateHolding } from "@/types/estate";
import type { EstateRow, EstateRpc } from "@/types/program";
import { useEstateHoldings, useHeirTx } from "@/hooks";
import {
  bySoonest,
  cancelScan,
  cardHasSweepable,
  cardProblemMessage,
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

function claimFine(finishing: boolean, viaCredential: boolean): string {
  if (finishing) {
    return "Hold the card to send what’s left. A little SOL stays on it so a retry can pay its fee.";
  }
  if (viaCredential) return "Fees are already covered by the card. You’ll tap it once more to sign.";
  return "0.75% is taken from the estate when you claim.";
}

/** claimOnce footer. "Claim to this card" is keepAsWallet, later. */
function cardSendLabel(busy: boolean, leftover: Leftover): string {
  if (busy) return "Hold still…";
  if (leftover === "some") return "Hold to finish sending";
  return "Claim to this wallet";
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
      <FactRow first label="From" value={shortAddress(from)} />
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

/**
 * The heir's view of one estate. Reached by tapping a credential (`?heir=`)
 * or from Home when this wallet is named as heir (`?estate=`).
 */
export default function ClaimScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ heir?: string; estate?: string }>();
  const { account, client, connect } = useMobileWallet();
  const { claimAll, claimWithCard } = useHeirTx();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [destError, setDestError] = useState<string | undefined>(undefined);
  const [holdHint, setHoldHint] = useState(false);
  const { ask, fail, cancel, confirm, extra } = useConfirmSheet();
  const viaCredential = params.heir !== undefined;

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
    viaCredential && found !== undefined && estateSpan(found.data, found.claimableLamports).state === "distributed",
  );

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
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

  async function runCardSend(row: EstateRow, dest: Address) {
    if (busy) return;
    setBusy(true);
    setHoldHint(true);
    try {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, NFC_UI_SETTLE_MS);
      });
      await claimWithCard(row, dest);
      setFlash("Claimed. The assets are on their way.");
      close();
    } catch (cause) {
      if (!isUserCancel(cause)) {
        fail("Claim", new Error(cardProblemMessage(cause, "Could not send from this credential.")));
        void fetchRow();
      }
    } finally {
      setHoldHint(false);
      setBusy(false);
    }
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
        await runCardSend(row, dest);
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
    void runCardSend(row, dest);
  }

  let body;
  let footer: ReactNode = null;
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
  } else {
    const row = load.row;
    const span = estateSpan(row.data, row.claimableLamports);
    const claimable = span.state === "claimable";
    const walletIsHeir = account?.address === row.data.heir;
    const hidden = viaCredential && !claimable && span.state !== "distributed";
    const leftoverPending = leftover === "idle" || leftover === "checking";
    const showSweep = viaCredential && (claimable || leftover === "some");

    if (span.state === "distributed" && leftover !== "some") {
      body = leftoverPending ? (
        <ChainLoading compact body="Checking what’s still on the card…" />
      ) : (
        <View style={{ gap: 14 }}>
          <View style={{ alignSelf: "flex-start" }}>
            <Pill dot label="Already claimed" />
          </View>
          <Display size={36}>This estate has been claimed.</Display>
        </View>
      );
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
    } else {
      const finishing = leftover === "some";
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
          <Fine>{claimFine(finishing, viaCredential)}</Fine>
        </View>
      );
    }

    if (showSweep) {
      footer = (
        <>
          <PrimaryButton
            icon="tap"
            label={cardSendLabel(busy, leftover)}
            disabled={busy}
            onPress={() => onWalletSend(row)}
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
      {footer !== null ? (
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
