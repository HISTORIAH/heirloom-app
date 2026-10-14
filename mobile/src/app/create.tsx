import { useMobileWallet } from "@wallet-ui/react-native-kit";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChainLoading } from "@/components/ChainLoading";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { AssetsStep } from "@/components/create/AssetsStep";
import {
  CredentialKindStep,
  CredentialModeStep,
  CredentialPinStep,
  CredentialReadyStep,
  CredentialTapStep,
  HandoverStep,
  TangemReadStep,
} from "@/components/create/CredentialSteps";
import { pinReady } from "@/components/claim/PinPad";
import { HeirStep, heirSummary } from "@/components/create/HeirStep";
import { Consent, ReviewStep } from "@/components/create/ReviewStep";
import { addressFromText } from "@/components/create/AddressField";
import { ScanAddress } from "@/components/create/ScanAddress";
import { TimingStep } from "@/components/create/TimingStep";
import { WizardFooter, WizardTop } from "@/components/create/WizardChrome";
import { Cap, PrimaryButton, TextLink } from "@/components/ui";
import { BACKEND_URL } from "@/config";
import { registerEstate } from "@/services/api/estateMetadata";
import { colors, space } from "@/theme";
import type {
  AssetOption,
  AssetSort,
  AssetTab,
  CreatePhase,
  CredentialMode,
  HandoverSecret,
  HeirKind,
  TapProgress,
} from "@/types/create";
import { useConfirmSheet, useOwnerTx, useSolBalance, useWalletTokens } from "@/hooks";
import { HANDOVER_NOTE, SOL_ASSET_ID } from "@/constants/create";
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
  digitsToPinBytes,
  lamportsToSolText,
  formatCreateAssetsLine,
  parseAddress,
  parseCreateDeposits,
  parseOptionalAddress,
  setFlash,
  setupBlankCard,
  setupProblemMessage,
  shortAddress,
  solToLamports,
  dueLong,
  durationRangeError,
  durationText,
} from "@/lib";
import { SECONDS_PER_DAY } from "@/constants/time";
import { SubmittedTxError } from "@/lib/failure";
import { CREDENTIAL_ADAPTERS, rememberCredential } from "@/lib/nfc/credentials";
import {
  isTangemCancel,
  isTangemSupported,
  readTangemCredential,
  tangemProblemMessage,
} from "@/lib/nfc/tangem";
import type { CredentialKind } from "@/types/nfc";

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

export default function CreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ heir?: string }>();
  const { account } = useMobileWallet();
  const { createEstate } = useOwnerTx();
  const { lamports: balance } = useSolBalance();
  const { tokens: walletTokens } = useWalletTokens(account?.address);
  const { ask, prompt, cancel, confirm, extra, fail } = useConfirmSheet();

  const [phase, setPhase] = useState<CreatePhase>("heir");
  const [heirKind, setHeirKind] = useState<HeirKind>(
    params.heir === "wallet" ? "wallet" : "credential",
  );
  const [heirAddr, setHeirAddr] = useState("");
  const [credential, setCredential] = useState<string | undefined>(undefined);
  const [credKind, setCredKind] = useState<CredentialKind>("heirloom");
  const [credMode, setCredMode] = useState<CredentialMode>("claimOnce");
  const [credName, setCredName] = useState("");
  const [pinDigits, setPinDigits] = useState("");
  const [pinFirst, setPinFirst] = useState("");
  const [pinError, setPinError] = useState<string | undefined>(undefined);
  const pinBytes = useRef<Uint8Array | undefined>(undefined);
  const [tapProgress, setTapProgress] = useState<TapProgress>("searching");
  const [tapError, setTapError] = useState<string | undefined>(undefined);
  const [label, setLabel] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({ [SOL_ASSET_ID]: "" });
  const [tab, setTab] = useState<AssetTab>("all");
  const [sort, setSort] = useState<AssetSort>("value");
  const [hideDust, setHideDust] = useState(true);
  const [everySecs, setEverySecs] = useState(DEFAULT_CHECK_IN_DAYS * SECONDS_PER_DAY);
  const [waitSecs, setWaitSecs] = useState(DEFAULT_GRACE_DAYS * SECONDS_PER_DAY);
  const [signer, setSigner] = useState("");
  const [guardian, setGuardian] = useState("");
  const [signerOpen, setSignerOpen] = useState(false);
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [acked, setAcked] = useState(false);
  const [scanFor, setScanFor] = useState<"heir" | "signer" | "guardian">("heir");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const scanToken = useRef(0);
  /** A create went out but never confirmed, so Discard can't promise nothing was sent. */
  const createMayHaveLanded = useRef(false);

  const isCredential = heirKind === "credential";
  const handoverSecret: HandoverSecret =
    credKind === "tangem" ? "accessCode" : credMode === "keepAsWallet" ? "pin" : "none";
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
  const selectedCount = Object.values(amounts).filter((t) => t.trim().length > 0).length;

  function setError(key: string, message: string | undefined) {
    setErrors((prev) => ({ ...prev, [key]: message }));
  }

  function dirty(): boolean {
    return (
      label.trim().length > 0 ||
      heirAddr.trim().length > 0 ||
      credential !== undefined ||
      Object.values(amounts).some((text) => text.trim().length > 0)
    );
  }

  function leave() {
    clearPin();
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
        body: createMayHaveLanded.current
          ? "It may already be created. Check your estates before making it again."
          : "Nothing has been sent yet.",
        cancelLabel: "Keep going",
        confirmLabel: "Discard",
      },
      leave,
    );
  }

  // ----- credential tap -------------------------------------------------------

  function clearPin() {
    pinBytes.current = undefined;
    setPinDigits("");
    setPinFirst("");
    setPinError(undefined);
  }

  function startTap() {
    const pin = credMode === "keepAsWallet" ? pinBytes.current : undefined;
    if (credMode === "keepAsWallet" && pin === undefined) {
      setPhase("credPin");
      return;
    }
    const token = ++scanToken.current;
    setTapProgress("searching");
    setTapError(undefined);
    setPhase("credTap");
    void (async () => {
      const result = await setupBlankCard((progress) => {
        if (token === scanToken.current) setTapProgress(progress);
      }, pin);
      if (token !== scanToken.current) return;
      if (result.kind === "cancelled") return;
      if (result.kind === "tangem") {
        setTapProgress("failed");
        setTapError("That’s a Tangem card. Go back and choose Tangem card.");
        return;
      }
      if (result.kind !== "address") {
        setTapProgress("failed");
        setTapError(setupProblemMessage(result));
        return;
      }
      clearPin();
      rememberCredential({ kind: "heirloom", address: parseAddress(result.value, "credential") });
      setCredential(result.value);
      setTapProgress("done");
      setPhase("credReady");
    })();
  }

  /** Tangem cards already hold a key: read its address through Tangem's sheet. */
  function startTangemRead() {
    const token = ++scanToken.current;
    setTapError(undefined);
    setPhase("credTap");
    void (async () => {
      try {
        const read = await readTangemCredential();
        if (token !== scanToken.current) return;
        rememberCredential({ kind: "tangem", ...read });
        setCredential(read.address);
        setPhase("credReady");
      } catch (cause) {
        if (token !== scanToken.current) return;
        if (isTangemCancel(cause)) {
          setPhase("credKind");
          return;
        }
        setTapError(tangemProblemMessage(cause, "Couldn’t read the card."));
      }
    })();
  }

  function onCredKindContinue() {
    if (credKind === "tangem") {
      startTangemRead();
      return;
    }
    setPhase("credMode");
  }

  /** Where Back and Cancel go from the tap step. */
  function beforeTap(): CreatePhase {
    if (credKind === "tangem") return "credKind";
    return credMode === "keepAsWallet" ? "credPin" : "credMode";
  }

  function stopTap(next: CreatePhase) {
    scanToken.current += 1;
    void cancelScan();
    setPhase(next);
  }

  function onCredModeContinue() {
    if (credMode === "keepAsWallet") {
      clearPin();
      setPhase("credPin");
      return;
    }
    startTap();
  }

  function onPinContinue() {
    if (!pinReady(pinDigits)) return;
    if (pinFirst.length === 0) {
      setPinFirst(pinDigits);
      setPinDigits("");
      setPinError(undefined);
      return;
    }
    if (pinDigits !== pinFirst) {
      setPinError("Those digits didn’t match. Try again.");
      setPinDigits("");
      return;
    }
    pinBytes.current = digitsToPinBytes(pinFirst);
    startTap();
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
      setPhase(isTangemSupported ? "credKind" : "credMode");
      return;
    }
    setPhase("assets");
  }

  function assetsGate(): boolean {
    try {
      const deposits = parseCreateDeposits(amounts, walletTokens);
      if (deposits.amountLamports === 0n && deposits.tokens.length === 0) {
        setError(SOL_ASSET_ID, "Enter an amount for at least one asset.");
        return false;
      }
    } catch (cause) {
      setError(SOL_ASSET_ID, cause instanceof Error ? cause.message : "Enter an amount.");
      return false;
    }
    if (hasSol && balance !== undefined && solAmount + floats > balance) {
      setError(SOL_ASSET_ID, "Not enough SOL in this wallet.");
      return false;
    }
    return true;
  }

  const timingError =
    durationRangeError(everySecs, CHECK_IN_MIN_DAYS, CHECK_IN_MAX_DAYS, "Check-in") ??
    durationRangeError(waitSecs, GRACE_MIN_DAYS, GRACE_MAX_DAYS, "Wait");

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
    setPhase("creating");
    try {
      const hasGuardian = guardian.trim().length > 0;
      const deposits = parseCreateDeposits(amounts, walletTokens);
      const { signature, estatePda } = await createEstate({
        heir: parseAddress(heirValue, "heir"),
        label: label.trim().slice(0, LABEL_MAX_LEN),
        checkInIntervalSecs: BigInt(everySecs),
        gracePeriodSecs: BigInt(waitSecs),
        delegatePauseDurationSecs: hasGuardian ? BigInt(DEFAULT_PAUSE_DAYS * SECONDS_PER_DAY) : 0n,
        amountLamports: deposits.amountLamports,
        tokens: deposits.tokens,
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
      if (cause instanceof SubmittedTxError) createMayHaveLanded.current = true;
      setPhase("review");
      fail("Estate creation", cause, () => void onCreate());
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
      case "credKind":
        setPhase("heir");
        return;
      case "credMode":
        setPhase(isTangemSupported ? "credKind" : "heir");
        return;
      case "credPin":
        if (pinFirst.length > 0) {
          setPinDigits("");
          setPinFirst("");
          setPinError(undefined);
          return;
        }
        clearPin();
        setPhase("credMode");
        return;
      case "credTap":
        stopTap(beforeTap());
        return;
      case "credReady":
        setPhase("heir");
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
  const assetText = formatCreateAssetsLine(amounts, assets);

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
    case "credKind":
      body = <CredentialKindStep kind={credKind} onKind={setCredKind} />;
      footer = <PrimaryButton label="Continue" onPress={onCredKindContinue} />;
      break;
    case "credMode":
      body = <CredentialModeStep mode={credMode} onMode={setCredMode} />;
      footer = <PrimaryButton label="Continue" onPress={onCredModeContinue} />;
      break;
    case "credPin":
      body = (
        <CredentialPinStep
          digits={pinDigits}
          confirm={pinFirst.length > 0}
          error={pinError}
          onDigit={(d) => {
            setPinError(undefined);
            setPinDigits((prev) => prev + d);
          }}
          onBackspace={() => setPinDigits((prev) => prev.slice(0, -1))}
        />
      );
      footer = (
        <PrimaryButton
          label={pinFirst.length > 0 ? "Set PIN" : "Continue"}
          disabled={!pinReady(pinDigits)}
          onPress={onPinContinue}
        />
      );
      break;
    case "credTap": {
      const tangem = credKind === "tangem";
      const failed = tangem ? tapError !== undefined : tapProgress === "failed";
      body = tangem ? (
        <TangemReadStep error={tapError} />
      ) : (
        <CredentialTapStep progress={tapProgress} error={tapError} />
      );
      footer = failed ? (
        <>
          <PrimaryButton label="Try again" onPress={tangem ? startTangemRead : startTap} />
          <TextLink label="Cancel" onPress={() => stopTap(beforeTap())} />
        </>
      ) : (
        <PrimaryButton tone="outline" label="Cancel" onPress={() => stopTap(beforeTap())} />
      );
      break;
    }
    case "credReady":
      body = (
        <CredentialReadyStep
          credential={credential ?? ""}
          name={credName}
          onName={setCredName}
          pinSet={credMode === "keepAsWallet"}
          kind={credKind}
        />
      );
      footer = (
        <>
          <PrimaryButton label="Continue" onPress={() => setPhase("assets")} />
          {credKind === "tangem" || credMode === "keepAsWallet" ? null : (
            <TextLink label="Tap again to double-check" onPress={startTap} />
          )}
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
          everySecs={everySecs}
          waitSecs={waitSecs}
          signer={signer}
          guardian={guardian}
          signerOpen={signerOpen}
          guardianOpen={guardianOpen}
          signerError={errors.signer}
          guardianError={errors.guardian}
          timingError={timingError}
          onEvery={setEverySecs}
          onWait={setWaitSecs}
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
          everySecs={everySecs}
          waitSecs={waitSecs}
          heir={heirText}
          assets={assetText}
          lines={[
            { label: "Estate", value: label.trim(), onEdit: () => setPhase("heir") },
            ...(isCredential
              ? [
                  {
                    label: "Credential",
                    value:
                      credKind === "tangem"
                        ? CREDENTIAL_ADAPTERS.tangem.label
                        : credMode === "keepAsWallet"
                          ? "Keep it as their wallet"
                          : "Tap to claim, once",
                    onEdit: () => setPhase(isTangemSupported ? "credKind" : "credMode"),
                  },
                ]
              : []),
            {
              label: "Heir",
              value:
                heirSummary(heirKind, heirValue) + (credName.trim() ? ` · ${credName.trim()}` : ""),
              onEdit: () => setPhase("heir"),
            },
            { label: "Assets", value: assetText, onEdit: () => setPhase("assets") },
            {
              label: "Check-in",
              value: `Every ${durationText(everySecs)} · ${signer.trim() ? `signer ${shortAddress(signer.trim())}` : "you sign"}`,
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
      body = <HandoverStep firstDue={dueLong(everySecs)} secret={handoverSecret} />;
      footer = (
        <>
          <PrimaryButton
            tone="outline"
            label="Send them a note"
            onPress={() =>
              void Share.share({
                message: HANDOVER_NOTE[handoverSecret],
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
