import { useMobileWallet } from "@wallet-ui/react-native-kit";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChainLoading } from "@/components/ChainLoading";
import { ConfirmSheet, useConfirmSheet } from "@/components/ConfirmSheet";
import { AssetsStep } from "@/components/create/AssetsStep";
import {
  CredentialModeStep,
  CredentialReadyStep,
  CredentialTapStep,
  HandoverStep,
} from "@/components/create/CredentialSteps";
import { HeirStep, heirSummary } from "@/components/create/HeirStep";
import { Consent, ReviewStep } from "@/components/create/ReviewStep";
import { addressFromText } from "@/components/create/AddressField";
import { ScanAddress } from "@/components/create/ScanAddress";
import { TimingStep } from "@/components/create/TimingStep";
import { ErrorLine, WizardFooter, WizardTop } from "@/components/create/WizardChrome";
import { Cap, PrimaryButton, TextLink } from "@/components/ui";
import { BACKEND_URL } from "@/config";
import { useOwnerTx } from "@/hooks/useOwnerTx";
import { registerEstate } from "@/services/api/estateMetadata";
import { colors, space } from "@/theme";
import type {
  AssetOption,
  AssetSort,
  AssetTab,
  CreatePhase,
  CredentialMode,
  HeirKind,
  TapProgress,
} from "@/types/create";
import { useSolBalance, useWalletTokens } from "@/hooks";
import { SOL_ASSET_ID } from "@/constants/create";
import {
  CHECK_IN_MAX_DAYS,
  CHECK_IN_MIN_DAYS,
  DEFAULT_CHECK_IN_DAYS,
  DEFAULT_GRACE_DAYS,
  DEFAULT_PAUSE_DAYS,
  GRACE_MAX_DAYS,
  GRACE_MIN_DAYS,
  LABEL_MAX_LEN,
} from "@/constants/estate";
import { CARD_FEE_FLOAT_LAMPORTS, CREATE_FEE_RESERVE_LAMPORTS } from "@/constants/fees";
import { SOL_LOGO_URL } from "@/constants/solana";
import {
  cancelScan,
  dateLong,
  daysRangeError,
  lamportsToSolText,
  parseAddress,
  parseOptionalAddress,
  scanCardAddress,
  setFlash,
  shortAddress,
  solToLamports,
} from "@/lib";
import { SECONDS_PER_DAY } from "@/constants/time";

function stepOf(phase: CreatePhase): number {
  if (phase === "assets") return 2;
  if (phase === "timing") return 3;
  if (phase === "review" || phase === "creating" || phase === "handover") return 4;
  return 1;
}

function phaseForStep(step: number): CreatePhase {
  if (step === 2) return "assets";
  if (step === 3) return "timing";
  if (step === 4) return "review";
  return "heir";
}

function failCopy(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message : "";
  if (/user (reject|denied|cancel)|rejected the request|cancel+ed the request/i.test(raw)) {
    return "Signing cancelled.";
  }
  return raw.length > 0 ? raw : "Could not create the estate.";
}

export default function CreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ heir?: string }>();
  const { account } = useMobileWallet();
  const { createEstate } = useOwnerTx();
  const { lamports: balance } = useSolBalance();
  const { tokens: walletTokens } = useWalletTokens(account?.address);
  const { ask, prompt, cancel, confirm, extra } = useConfirmSheet();

  const [phase, setPhase] = useState<CreatePhase>("heir");
  const [heirKind, setHeirKind] = useState<HeirKind>(
    params.heir === "wallet" ? "wallet" : "credential",
  );
  const [heirAddr, setHeirAddr] = useState("");
  const [credential, setCredential] = useState<string | undefined>(undefined);
  const [credMode, setCredMode] = useState<CredentialMode>("claimOnce");
  const [credName, setCredName] = useState("");
  const [tapProgress, setTapProgress] = useState<TapProgress>("searching");
  const [tapError, setTapError] = useState<string | undefined>(undefined);
  const [label, setLabel] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({ [SOL_ASSET_ID]: "" });
  const [tab, setTab] = useState<AssetTab>("all");
  const [sort, setSort] = useState<AssetSort>("value");
  const [hideDust, setHideDust] = useState(true);
  const [everyDays, setEveryDays] = useState(DEFAULT_CHECK_IN_DAYS);
  const [waitDays, setWaitDays] = useState(DEFAULT_GRACE_DAYS);
  const [signer, setSigner] = useState("");
  const [guardian, setGuardian] = useState("");
  const [signerOpen, setSignerOpen] = useState(false);
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [acked, setAcked] = useState(false);
  const [scanFor, setScanFor] = useState<"heir" | "signer" | "guardian">("heir");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const scanToken = useRef(0);

  const isCredential = heirKind === "credential";
  const heirValue = isCredential ? (credential ?? "") : heirAddr.trim();

  const floats =
    (isCredential ? CARD_FEE_FLOAT_LAMPORTS : 0n) +
    (signer.trim().length > 0 ? CARD_FEE_FLOAT_LAMPORTS : 0n);

  const assets = useMemo<AssetOption[]>(() => {
    const solBalance = balance === undefined ? 0 : Number(lamportsToSolText(balance));
    const sol: AssetOption = {
      id: SOL_ASSET_ID,
      kind: "sol",
      symbol: "SOL",
      name: "Solana",
      balance: balance === undefined ? "…" : lamportsToSolText(balance),
      balanceRaw: solBalance,
      usd: null,
      dust: false,
      image: SOL_LOGO_URL,
    };
    const spl: AssetOption[] = walletTokens.map((t) => ({
      id: t.mint,
      kind: "token" as const,
      symbol: t.symbol,
      name: t.name,
      balance: t.balance,
      balanceRaw: Number(t.balance.replace(/,/g, "")),
      usd: null,
      dust: false,
      image: t.image,
    }));
    return [sol, ...spl];
  }, [balance, walletTokens]);

  const solText = amounts[SOL_ASSET_ID];
  const solAmount =
    solText !== undefined && solText.trim().length > 0
      ? (() => {
          try {
            return solToLamports(solText);
          } catch {
            return 0n;
          }
        })()
      : 0n;
  const hasSol = solAmount > 0n;
  const hasToken = Object.entries(amounts).some(
    ([id, text]) => id !== SOL_ASSET_ID && text.trim().length > 0,
  );
  const selectedCount = Object.values(amounts).filter((t) => t.trim().length > 0).length;

  function setError(key: string, message: string | undefined) {
    setErrors((prev) => ({ ...prev, [key]: message }));
  }

  function dirty(): boolean {
    return (
      label.trim().length > 0 ||
      heirAddr.trim().length > 0 ||
      credential !== undefined ||
      (solText ?? "").trim().length > 0
    );
  }

  function leave() {
    void cancelScan();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  function onClose() {
    if (phase === "creating") return;
    if (phase === "handover" || !dirty()) {
      leave();
      return;
    }
    prompt(
      {
        cap: "Discard",
        title: "Discard this estate?",
        body: "Nothing has been sent yet.",
        cancelLabel: "Keep going",
        confirmLabel: "Discard",
      },
      leave,
    );
  }

  // ----- credential tap -------------------------------------------------------

  function startTap() {
    const token = ++scanToken.current;
    setTapProgress("searching");
    setTapError(undefined);
    setPhase("credTap");
    void (async () => {
      const result = await scanCardAddress();
      if (token !== scanToken.current) return;
      if (result.kind === "cancelled") return;
      if (result.kind !== "address") {
        setTapProgress("failed");
        setTapError(
          result.kind === "off"
            ? "NFC is off. Turn it on, then try again."
            : result.kind === "unsupported"
              ? "This phone can’t set up credentials."
              : result.kind === "empty"
                ? "We couldn’t read a key from it. Try again."
                : result.message,
        );
        return;
      }
      // TODO(nfc): on-chip key generation and the test signature. Today the tap reads the credential's address.
      setTapProgress("found");
      setTimeout(() => {
        if (token !== scanToken.current) return;
        setTapProgress("done");
        setCredential(result.value);
        setTimeout(() => {
          if (token === scanToken.current) setPhase("credReady");
        }, 500);
      }, 600);
    })();
  }

  function stopTap(next: CreatePhase) {
    scanToken.current += 1;
    void cancelScan();
    setPhase(next);
  }

  // ----- step gates -----------------------------------------------------------

  function heirGate(): boolean {
    let ok = true;
    if (label.trim().length === 0) {
      setError("label", "Name this estate.");
      ok = false;
    }
    if (!isCredential) {
      try {
        const heir = parseAddress(heirAddr, "heir address");
        if (account?.address === heir) {
          setError("heir", "That’s this wallet. Use a different one.");
          ok = false;
        }
      } catch {
        setError("heir", "Enter a valid Solana address.");
        ok = false;
      }
    }
    return ok;
  }

  function onHeirContinue() {
    if (!heirGate()) return;
    if (isCredential && credential === undefined) {
      setPhase("credMode");
      return;
    }
    setPhase("assets");
  }

  function assetsGate(): boolean {
    if (!hasSol && !hasToken) {
      setError(SOL_ASSET_ID, "Enter an amount for at least one asset.");
      return false;
    }
    if (hasSol && balance !== undefined && solAmount + floats > balance) {
      setError(SOL_ASSET_ID, "Not enough SOL in this wallet.");
      return false;
    }
    return true;
  }

  const timingError =
    daysRangeError(everyDays, CHECK_IN_MIN_DAYS, CHECK_IN_MAX_DAYS, "Check-in") ??
    daysRangeError(waitDays, GRACE_MIN_DAYS, GRACE_MAX_DAYS, "Wait");

  function timingGate(): boolean {
    let ok = timingError === undefined;
    try {
      parseOptionalAddress(signer, "check-in signer");
    } catch {
      setError("signer", "Enter a valid Solana address.");
      ok = false;
    }
    try {
      parseOptionalAddress(guardian, "guardian");
    } catch {
      setError("guardian", "Enter a valid Solana address.");
      ok = false;
    }
    return ok;
  }

  // ----- create ---------------------------------------------------------------

  async function onCreate() {
    if (!acked || phase === "creating") return;
    const gate: CreatePhase | undefined = !heirGate()
      ? "heir"
      : !assetsGate()
        ? "assets"
        : !timingGate()
          ? "timing"
          : undefined;
    if (gate !== undefined) {
      setPhase(gate);
      return;
    }
    setSubmitError(undefined);
    setPhase("creating");
    try {
      const hasGuardian = guardian.trim().length > 0;
      const { signature, estatePda } = await createEstate({
        heir: parseAddress(heirValue, "heir"),
        label: label.trim().slice(0, LABEL_MAX_LEN),
        checkInIntervalSecs: BigInt(everyDays * SECONDS_PER_DAY),
        gracePeriodSecs: BigInt(waitDays * SECONDS_PER_DAY),
        delegatePauseDurationSecs: hasGuardian ? BigInt(DEFAULT_PAUSE_DAYS * SECONDS_PER_DAY) : 0n,
        amountLamports: solAmount,
        delegate: parseOptionalAddress(guardian, "guardian"),
        checkInSigner: parseOptionalAddress(signer, "check-in signer"),
        fundHeir: isCredential,
      });
      // The backend reads the name from the memo in the create tx.
      if (BACKEND_URL) {
        try {
          await registerEstate({ estateAddress: String(estatePda), txSignature: signature });
        } catch {
          // Non-blocking: the estate exists on chain either way.
        }
      }
      if (isCredential) {
        setPhase("handover");
        return;
      }
      setFlash("Estate created.");
      router.replace("/");
    } catch (cause) {
      setSubmitError(failCopy(cause));
      setPhase("review");
    }
  }

  // ----- back -----------------------------------------------------------------

  function goBack() {
    switch (phase) {
      case "heir":
        onClose();
        return;
      case "scanAddress":
        setPhase(scanFor === "heir" ? "heir" : "timing");
        return;
      case "credMode":
        setPhase("heir");
        return;
      case "credTap":
        stopTap("credMode");
        return;
      case "credReady":
        setPhase("credMode");
        return;
      case "assets":
        setPhase(isCredential ? "credReady" : "heir");
        return;
      case "timing":
        setPhase("assets");
        return;
      case "review":
        setPhase("timing");
        return;
      case "handover":
        leave();
        return;
      default:
        return;
    }
  }

  const backRef = useRef(goBack);
  backRef.current = goBack;
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      backRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => () => void cancelScan(), []);

  // ----- render ---------------------------------------------------------------

  if (phase === "scanAddress") {
    const back = scanFor === "heir" ? "heir" : "timing";
    const write = (value: string) => {
      if (scanFor === "heir") setHeirAddr(value);
      if (scanFor === "signer") setSigner(value);
      if (scanFor === "guardian") setGuardian(value);
      setError(scanFor, undefined);
    };
    return (
      <ScanAddress
        onBack={() => setPhase(back)}
        onAddress={(value) => {
          write(value);
          setPhase(back);
        }}
        onPaste={() => {
          void Clipboard.getStringAsync().then((text) => {
            if (text.trim().length > 0) write(addressFromText(text));
            setPhase(back);
          });
        }}
      />
    );
  }

  const heirText = isCredential
    ? credential !== undefined
      ? `credential ····${credential.slice(-4)}`
      : "your credential"
    : heirAddr.trim().length > 0
      ? shortAddress(heirAddr.trim())
      : "your heir";
  const assetText = (solText ?? "").trim().length > 0 ? `${solText?.trim()} SOL` : "nothing yet";

  const fees = [
    ...(isCredential ? [{ label: "Credential claim fees (prepaid)", value: "0.02 SOL" }] : []),
    ...(signer.trim().length > 0
      ? [{ label: "Check-in signer fees (prepaid)", value: "0.02 SOL" }]
      : []),
    { label: "Network fee", value: "Shown in your wallet" },
  ];

  let body;
  let footer;
  switch (phase) {
    case "heir":
      body = (
        <HeirStep
          kind={heirKind}
          address={heirAddr}
          addressError={errors.heir}
          credential={credential}
          label={label}
          labelError={errors.label}
          onKind={(kind) => {
            setHeirKind(kind);
            setError("heir", undefined);
          }}
          onAddress={(next) => {
            setHeirAddr(next);
            setError("heir", undefined);
          }}
          onScan={() => {
            setScanFor("heir");
            setPhase("scanAddress");
          }}
          onLabel={(next) => {
            setLabel(next);
            setError("label", undefined);
          }}
        />
      );
      footer = (
        <PrimaryButton
          label={isCredential && credential === undefined ? "Set up credential" : "Continue"}
          onPress={onHeirContinue}
        />
      );
      break;
    case "credMode":
      body = <CredentialModeStep mode={credMode} onMode={setCredMode} />;
      footer = <PrimaryButton label="Continue" onPress={startTap} />;
      break;
    case "credTap":
      body = <CredentialTapStep progress={tapProgress} error={tapError} />;
      footer =
        tapProgress === "failed" ? (
          <>
            <PrimaryButton label="Try again" onPress={startTap} />
            <TextLink label="Cancel" onPress={() => stopTap("credMode")} />
          </>
        ) : (
          <PrimaryButton tone="outline" label="Cancel" onPress={() => stopTap("credMode")} />
        );
      break;
    case "credReady":
      body = (
        <CredentialReadyStep credential={credential ?? ""} name={credName} onName={setCredName} />
      );
      footer = (
        <>
          <PrimaryButton label="Continue" onPress={() => setPhase("assets")} />
          <TextLink label="Tap again to double-check" onPress={startTap} />
        </>
      );
      break;
    case "assets":
      body = (
        <AssetsStep
          assets={assets}
          amounts={amounts}
          errors={errors}
          tab={tab}
          sort={sort}
          hideDust={hideDust}
          onTab={setTab}
          onSort={setSort}
          onHideDust={setHideDust}
          onToggle={(id) => {
            setError(id, undefined);
            setAmounts((prev) => {
              const next = { ...prev };
              if (next[id] === undefined) next[id] = "";
              else delete next[id];
              return next;
            });
          }}
          onAmount={(id, value) => {
            setError(id, undefined);
            setAmounts((prev) => ({ ...prev, [id]: value }));
          }}
          onMax={(id) => {
            if (id !== SOL_ASSET_ID || balance === undefined) return;
            const spare = balance - CREATE_FEE_RESERVE_LAMPORTS - floats;
            setError(id, undefined);
            setAmounts((prev) => ({ ...prev, [id]: spare > 0n ? lamportsToSolText(spare) : "0" }));
          }}
        />
      );
      footer = (
        <PrimaryButton
          label={`Continue · ${selectedCount} selected`}
          onPress={() => {
            if (assetsGate()) setPhase("timing");
          }}
        />
      );
      break;
    case "timing":
      body = (
        <TimingStep
          everyDays={everyDays}
          waitDays={waitDays}
          signer={signer}
          guardian={guardian}
          signerOpen={signerOpen}
          guardianOpen={guardianOpen}
          signerError={errors.signer}
          guardianError={errors.guardian}
          timingError={timingError}
          onEvery={setEveryDays}
          onWait={setWaitDays}
          onSigner={(next) => {
            setSigner(next);
            setError("signer", undefined);
          }}
          onGuardian={(next) => {
            setGuardian(next);
            setError("guardian", undefined);
          }}
          onSignerOpen={setSignerOpen}
          onGuardianOpen={setGuardianOpen}
          onScan={(target) => {
            setScanFor(target);
            setPhase("scanAddress");
          }}
        />
      );
      footer = (
        <PrimaryButton
          label="Continue"
          onPress={() => {
            if (timingGate()) setPhase("review");
          }}
        />
      );
      break;
    case "review":
      body = (
        <ReviewStep
          everyDays={everyDays}
          waitDays={waitDays}
          heir={heirText}
          assets={assetText}
          lines={[
            { label: "Estate", value: label.trim(), onEdit: () => setPhase("heir") },
            {
              label: "Heir",
              value:
                heirSummary(heirKind, heirValue) + (credName.trim() ? ` · ${credName.trim()}` : ""),
              onEdit: () => setPhase("heir"),
            },
            { label: "Assets", value: assetText, onEdit: () => setPhase("assets") },
            {
              label: "Check-in",
              value: `Every ${everyDays} days · ${signer.trim() ? `signer ${shortAddress(signer.trim())}` : "you sign"}`,
              onEdit: () => setPhase("timing"),
            },
            {
              label: "Guardian",
              value: guardian.trim() ? shortAddress(guardian.trim()) : "None",
              onEdit: () => setPhase("timing"),
            },
          ]}
          fees={fees}
        />
      );
      footer = (
        <>
          <ErrorLine>{submitError}</ErrorLine>
          <Consent on={acked} onToggle={() => setAcked((on) => !on)} />
          <PrimaryButton label="Create estate" disabled={!acked} onPress={() => void onCreate()} />
        </>
      );
      break;
    case "creating":
      body = <ChainLoading compact body="Confirm in your wallet…" />;
      footer = null;
      break;
    case "handover":
      body = <HandoverStep firstDue={dateLong(everyDays)} />;
      footer = (
        <>
          <PrimaryButton
            tone="outline"
            label="Send them a note"
            onPress={() =>
              void Share.share({
                message:
                  "I’ve set up an Heirloom credential for you. If something happens to me, tap it on your phone.",
              })
            }
          />
          <View style={{ height: 6 }} />
          <PrimaryButton
            label="Done"
            onPress={() => {
              setFlash("Estate created.");
              router.replace("/");
            }}
          />
        </>
      );
      break;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {phase === "handover" ? (
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: space.pad }}>
          <Cap>Estate created</Cap>
        </View>
      ) : (
        <WizardTop
          step={stepOf(phase)}
          onClose={onClose}
          onStep={(s) => setPhase(phaseForStep(s))}
        />
      )}
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: space.pad, paddingTop: 12, paddingBottom: 28 }}
      >
        {body}
      </ScrollView>
      {footer ? <WizardFooter>{footer}</WizardFooter> : null}
      <ConfirmSheet ask={ask} onCancel={cancel} onConfirm={confirm} onExtra={extra} />
    </KeyboardAvoidingView>
  );
}
