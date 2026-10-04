import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChainLoading } from "@/components/ChainLoading";
import { ConfirmSheet, useConfirmSheet } from "@/components/ConfirmSheet";
import { NfcDummyCard } from "@/components/NfcDummyCard";
import { Wordmark } from "@/components/Wordmark";
import { WizardFooter } from "@/components/create/WizardChrome";
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
import { colors, space } from "@/theme";
import { EstateRow } from "@/types/program";
import { useHeirTx } from "@/hooks";
import {
  bySoonest,
  estateSpan,
  fetchEstateByAddress,
  fetchEstatesByHeir,
  lamportsToSolText,
  parseAddress,
  registeredTokenCount,
  setFlash,
  shortAddress,
} from "@/lib";

type Load =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "error"; message: string }
  | { kind: "found"; row: EstateRow };

/**
 * The heir's view of one estate. Reached by tapping a credential (`?heir=`)
 * or from Home when this wallet is named as heir (`?estate=`).
 */
export default function ClaimScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ heir?: string; estate?: string }>();
  const { account, client } = useMobileWallet();
  const { claimAll } = useHeirTx();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const { ask, notice, fail, cancel, confirm, extra } = useConfirmSheet();
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

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  function later(title: string) {
    notice({
      cap: "Coming next",
      title,
      body: "Credential signing lands with the NFC integration.",
    });
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

  let body;
  let footer: ReactNode = null;
  if (load.kind === "loading") {
    body = <ChainLoading compact body="Checking what it can claim…" />;
  } else if (load.kind === "error") {
    body = (
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 15, color: colors.claim }}>
          {load.message}
        </Text>
        <TextLink align="left" label="Try again" onPress={() => void fetchRow()} />
      </View>
    );
  } else if (load.kind === "none") {
    body = (
      <View style={{ gap: 14 }}>
        <Pill dot label="Nothing linked" />
        <Display size={32}>
          {viaCredential ? "This credential isn’t linked to an estate." : "No estate here."}
        </Display>
        <Fine>If someone set it up for you, they may not have finished yet.</Fine>
      </View>
    );
  } else {
    const row = load.row;
    const span = estateSpan(row.data, row.claimableLamports);
    const claimable = span.state === "claimable";
    const tokens = registeredTokenCount(row.data.claimableAssets);
    const walletIsHeir = account?.address === row.data.heir;
    // A credential shows nothing about the estate until the owner's check-in lapses.
    const hidden = viaCredential && !claimable;

    if (span.state === "distributed") {
      body = (
        <View style={{ gap: 14 }}>
          <Pill dot label="Already claimed" />
          <Display size={32}>This estate has been claimed.</Display>
        </View>
      );
    } else if (hidden) {
      body = (
        <View style={{ gap: 14 }}>
          <Pill dot label="Not yet" />
          <Display size={32}>Nothing to claim yet.</Display>
          <Fine>Keep it somewhere safe. If the time comes, tap it again.</Fine>
        </View>
      );
    } else {
      body = (
        <View style={{ gap: 16 }}>
          <Pill
            dot
            label={claimable ? "Claimable now" : `Opens in ${span.daysUntilClaim} days`}
            fill={claimable ? colors.yellow : colors.paper}
          />
          <Display size={32}>
            {viaCredential
              ? "This credential can claim an estate."
              : claimable
                ? "You can claim this estate."
                : "You’re named as heir."}
          </Display>
          <Card radius={18} padding={0} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            <FactRow first label="From" value={shortAddress(String(row.data.authority))} />
            <FactRow strong label="SOL" value={lamportsToSolText(row.claimableLamports)} />
            {tokens > 0 ? <FactRow strong label="Tokens" value={String(tokens)} /> : null}
          </Card>
          <Fine>
            {viaCredential
              ? "Fees are already covered by the credential. You’ll tap it once more to sign."
              : "0.75% is taken from the estate when you claim."}
          </Fine>
        </View>
      );
    }

    if (claimable) {
      footer = viaCredential ? (
        <>
          <PrimaryButton
            icon="tap"
            label="Claim to this credential"
            onPress={() => later("Claiming to a credential comes next")}
          />
          <PrimaryButton
            tone="paper"
            label="Send to a wallet I own"
            onPress={() => later("Sending to your wallet comes next")}
          />
        </>
      ) : walletIsHeir ? (
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
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: space.pad,
          paddingTop: 16,
          paddingBottom: 24,
          gap: 16,
        }}
      >
        {viaCredential ? (
          <View style={{ alignItems: "center" }}>
            <NfcDummyCard width={260} />
          </View>
        ) : null}
        {body}
      </ScrollView>
      {footer !== null ? <WizardFooter>{footer}</WizardFooter> : null}
      <ConfirmSheet ask={ask} onCancel={cancel} onConfirm={confirm} onExtra={extra} />
    </View>
  );
}
