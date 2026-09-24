import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { ChainLoading } from "@/components/ChainLoading";
import { AssetsStep } from "@/components/create/AssetsStep";
import { CardScanOverlay } from "@/components/create/CardScanOverlay";
import { HeartbeatStep } from "@/components/create/HeartbeatStep";
import { HeirsStep } from "@/components/create/HeirsStep";
import { ReviewStep } from "@/components/create/ReviewStep";
import { FabClearance, WizardFooter } from "@/components/create/WizardFooter";
import { WizardRail } from "@/components/create/WizardRail";
import { useLiftIntoScroll } from "@/components/create/useLiftIntoScroll";
import { useOwnerTx } from "@/hooks/useOwnerTx";
import { useSolBalance } from "@/hooks/useSolBalance";
import { shortAddress } from "@/lib/address";
import {
  DEFAULT_GRACE_DAYS,
  DEFAULT_HEARTBEAT_DAYS,
  DEFAULT_PAUSE_DAYS,
  LABEL_MAX_LEN,
  SECONDS_PER_DAY,
} from "@/lib/constants";
import {
  GRACE_MAX_DAYS,
  GRACE_MIN_DAYS,
  HB_MAX_DAYS,
  HB_MIN_DAYS,
  PAUSE_MAX_DAYS,
  PAUSE_MIN_DAYS,
  daysRangeError,
} from "@/lib/estateTiming";
import { lamportsToSolText, solToLamports } from "@/lib/lamports";
import { parseAddress, parseOptionalAddress } from "@/lib/ownerWrites";
import { setFlash } from "@/lib/flash";
import { cancelScan, scanCardAddress, type CardScan } from "@/lib/nfc";
import { colors } from "@/theme";

type SubmitState = "idle" | "creating" | "complete";

const CONNECT_WALLET_COPY = "Connect a wallet to create.";

function solIssue(sol: string, balance?: bigint): string | undefined {
  try {
    const lamports = solToLamports(sol);
    if (balance !== undefined && lamports > balance) {
      return "Not enough SOL in this wallet.";
    }
    return undefined;
  } catch {
    return "Enter an amount.";
  }
}

function heirsGateReady(
  label: string,
  heir: string,
  guardian: string,
  signer: string,
): boolean {
  if (label.trim().length === 0) return false;
  try {
    parseAddress(heir, "heir");
    parseOptionalAddress(guardian, "guardian");
    parseOptionalAddress(signer, "check-in signer");
    return true;
  } catch {
    return false;
  }
}

function cardScanMessage(
  result: Exclude<CardScan, { kind: "address" | "cancelled" }>,
): string {
  if (result.kind === "off") return "NFC is off. Turn it on, then tap the card again.";
  if (result.kind === "unsupported") return "This phone cannot read NFC cards.";
  if (result.kind === "empty") return "This card has no Solana address.";
  return result.message;
}

function writeCardScan(
  result: CardScan,
  setValue: (value: string) => void,
  setError: (message: string | undefined) => void,
) {
  if (result.kind === "cancelled") return;
  if (result.kind === "address") {
    setError(undefined);
    setValue(result.value);
    return;
  }
  setError(cardScanMessage(result));
}

function createFailCopy(cause: unknown, walletOn: boolean): string {
  const raw = cause instanceof Error ? cause.message : "";
  const aborted =
    /user (reject|denied|cancel)|rejected the request|cancelled the request|canceled the request/i.test(
      raw,
    );
  if (aborted && !walletOn) return CONNECT_WALLET_COPY;
  if (aborted) return "Signing cancelled.";
  return raw.length > 0 ? raw : "Could not create the estate";
}

export default function CreateScreen() {
  const router = useRouter();
  const { createEstate } = useOwnerTx();
  const { lamports: balance, loading: balanceLoading, connected, connect } =
    useSolBalance();

  const [step, setStep] = useState(1);
  const [farthest, setFarthest] = useState(1);
  const [label, setLabel] = useState("");
  const [heir, setHeir] = useState("");
  const [guardian, setGuardian] = useState("");
  const [signer, setSigner] = useState("");
  const [sol, setSol] = useState("");
  const [solPct, setSolPct] = useState<number | undefined>(undefined);
  const [heartbeatDays, setHeartbeatDays] = useState(DEFAULT_HEARTBEAT_DAYS);
  const [graceDays, setGraceDays] = useState(DEFAULT_GRACE_DAYS);
  const [pauseDays, setPauseDays] = useState(DEFAULT_PAUSE_DAYS);
  const [fundHeir, setFundHeir] = useState(false);
  const [acked, setAcked] = useState(false);
  const [submit, setSubmit] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const [labelError, setLabelError] = useState<string | undefined>(undefined);
  const [heirError, setHeirError] = useState<string | undefined>(undefined);
  const [guardianError, setGuardianError] = useState<string | undefined>(undefined);
  const [signerError, setSignerError] = useState<string | undefined>(undefined);
  const [scanning, setScanning] = useState<"heir" | "signer" | undefined>(undefined);

  const { frameRef, scrollRef, keyboardOpen, kbPad, onLift, onScroll } =
    useLiftIntoScroll();

  const submitRef = useRef(submit);
  const connectedRef = useRef(connected);
  const focusedRef = useRef(true);
  const scanLock = useRef(false);
  submitRef.current = submit;
  connectedRef.current = connected;

  const amountError = useMemo(() => solIssue(sol, balance), [sol, balance]);
  const hasSol = useMemo(() => {
    try {
      return solToLamports(sol) > 0n;
    } catch {
      return false;
    }
  }, [sol]);
  const solEmpty = !hasSol;
  const hasGuardian = guardian.trim().length > 0;
  const heartbeatError = daysRangeError(
    heartbeatDays,
    HB_MIN_DAYS,
    HB_MAX_DAYS,
    "Check-in",
  );
  const graceError = daysRangeError(
    graceDays,
    GRACE_MIN_DAYS,
    GRACE_MAX_DAYS,
    "Grace",
  );
  const pauseError = hasGuardian
    ? daysRangeError(pauseDays, PAUSE_MIN_DAYS, PAUSE_MAX_DAYS, "Pause")
    : undefined;
  const timingBlocked =
    heartbeatError !== undefined ||
    graceError !== undefined ||
    pauseError !== undefined;
  const heirsLooksReady = heirsGateReady(label, heir, guardian, signer);
  const createReady = acked && hasSol && submit !== "creating";

  const heirShort =
    heir.trim().length > 8 ? shortAddress(heir.trim(), 6) : heir.trim() || "—";
  const guardianShort =
    guardian.trim().length > 0 ? shortAddress(guardian.trim(), 6) : undefined;
  const signerShort =
    signer.trim().length > 0 ? shortAddress(signer.trim(), 6) : undefined;

  const hero = hasSol ? `${sol.trim()} SOL` : "Nothing yet";
  const balanceLine = connected
    ? balanceLoading || balance === undefined
      ? "Balance: …"
      : `Balance: ${lamportsToSolText(balance)} SOL`
    : undefined;

  const reviewReason = reviewGate(hasSol, acked);

  useEffect(() => {
    if (!connected) return;
    setSubmitError((current) =>
      current === CONNECT_WALLET_COPY ? undefined : current,
    );
  }, [connected]);

  const resetForm = useCallback(() => {
    setStep(1);
    setFarthest(1);
    setLabel("");
    setHeir("");
    setGuardian("");
    setSigner("");
    setSol("");
    setSolPct(undefined);
    setHeartbeatDays(DEFAULT_HEARTBEAT_DAYS);
    setGraceDays(DEFAULT_GRACE_DAYS);
    setPauseDays(DEFAULT_PAUSE_DAYS);
    setFundHeir(false);
    setAcked(false);
    setSubmit("idle");
    setSubmitError(undefined);
    setLabelError(undefined);
    setHeirError(undefined);
    setGuardianError(undefined);
    setSignerError(undefined);
    setScanning(undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      return () => {
        focusedRef.current = false;
        void cancelScan();
        if (submitRef.current === "creating") return;
        resetForm();
      };
    }, [resetForm]),
  );

  function onScanCard(role: "heir" | "signer") {
    if (scanLock.current || scanning !== undefined) return;
    scanLock.current = true;
    const setValue = role === "heir" ? setHeir : setSigner;
    const setError = role === "heir" ? setHeirError : setSignerError;
    void (async () => {
      try {
        const result = await scanCardAddress(() => setScanning(role));
        if (focusedRef.current) writeCardScan(result, setValue, setError);
      } finally {
        scanLock.current = false;
        setScanning(undefined);
      }
    })();
  }

  function validateHeirs(): boolean {
    let ok = true;
    if (label.trim().length === 0) {
      setLabelError("Name this estate.");
      ok = false;
    } else {
      setLabelError(undefined);
    }
    if (heir.trim().length === 0) {
      setHeirError("Enter a valid heir address.");
      ok = false;
    } else {
      try {
        parseAddress(heir, "heir");
        setHeirError(undefined);
      } catch {
        setHeirError("Enter a valid heir address.");
        ok = false;
      }
    }
    try {
      parseOptionalAddress(guardian, "guardian");
      setGuardianError(undefined);
    } catch {
      setGuardianError("Check the address");
      ok = false;
    }
    try {
      parseOptionalAddress(signer, "check-in signer");
      setSignerError(undefined);
    } catch {
      setSignerError("Check the address");
      ok = false;
    }
    return ok;
  }

  function goJump(n: number) {
    if (n > 1 && !validateHeirs()) {
      setStep(1);
      return;
    }
    if (n > 3 && timingBlocked) {
      setStep(3);
      return;
    }
    setStep(n);
  }

  function goNext() {
    if (step === 1 && !validateHeirs()) return;
    if (step === 2 && amountError !== undefined) return;
    if (step === 3 && timingBlocked) return;
    const opened = Math.min(4, step + 1);
    let target = Math.max(opened, farthest);
    if (timingBlocked && target > 3) target = 3;
    setFarthest(Math.max(farthest, opened));
    setStep(target);
  }

  function dropIfLeft(): boolean {
    if (focusedRef.current) return false;
    resetForm();
    return true;
  }

  async function onCreate() {
    if (!createReady) return;
    if (!validateHeirs()) {
      setStep(1);
      return;
    }
    if (timingBlocked) {
      setStep(3);
      return;
    }
    setSubmitError(undefined);
    setSubmit("creating");
    try {
      await createEstate({
        heir: parseAddress(heir, "heir"),
        label: label.trim().slice(0, LABEL_MAX_LEN),
        heartbeatInterval: BigInt(heartbeatDays * SECONDS_PER_DAY),
        gracePeriod: BigInt(graceDays * SECONDS_PER_DAY),
        pauseDuration: hasGuardian
          ? BigInt(pauseDays * SECONDS_PER_DAY)
          : 0n,
        amountLamports: solToLamports(sol),
        delegate: parseOptionalAddress(guardian, "guardian"),
        hbSigner: parseOptionalAddress(signer, "check-in signer"),
        fundHeir,
      });
      if (dropIfLeft()) return;
      setFlash("Estate open.");
      router.replace("/");
      return;
    } catch (cause) {
      setSubmit("idle");
      if (dropIfLeft()) return;
      setSubmitError(createFailCopy(cause, connectedRef.current));
    }
  }

  async function onConnect() {
    try {
      await connect();
    } catch (cause) {
      setSubmitError(
        cause instanceof Error ? cause.message : "Could not connect",
      );
    }
  }

  function onPickPct(pct: number) {
    if (balance === undefined) return;
    setSolPct(pct);
    setSol(lamportsToSolText((balance * BigInt(pct)) / 100n));
  }

  const complete = submit === "complete";
  const creating = submit === "creating";
  const showFooter = !creating && !complete;
  const errorLine =
    submitError === CONNECT_WALLET_COPY && connected ? undefined : submitError;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <CardScanOverlay role={scanning} onCancel={() => void cancelScan()} />
      <AppHeader />
      <WizardRail
        step={step}
        farthest={farthest}
        complete={complete}
        frozen={creating}
        onJump={goJump}
      />
      <View ref={frameRef} collapsable={false} style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentContainerStyle={{ padding: 20, paddingBottom: 24 + kbPad }}
      >
        {creating ? (
          <ChainLoading body="Confirm in your wallet" />
        ) : (
          <>
            {step === 1 ? (
              <HeirsStep
                label={label}
                heir={heir}
                guardian={guardian}
                signer={signer}
                labelError={labelError}
                heirError={heirError}
                guardianError={guardianError}
                signerError={signerError}
                setLabel={setLabel}
                setHeir={setHeir}
                setGuardian={setGuardian}
                setSigner={setSigner}
                clearLabelError={() => setLabelError(undefined)}
                clearHeirError={() => setHeirError(undefined)}
                clearGuardianError={() => setGuardianError(undefined)}
                clearSignerError={() => setSignerError(undefined)}
                scanning={scanning}
                onScanCard={onScanCard}
                onLift={onLift}
              />
            ) : null}
            {step === 2 ? (
              <AssetsStep
                sol={sol}
                solError={amountError}
                hero={hero}
                selectedPct={solPct}
                chipsDisabled={!connected || balance === undefined || balance <= 0n}
                showClear={hasSol}
                balanceLine={balanceLine}
                disconnected={!connected}
                onChangeSol={(v) => {
                  setSolPct(undefined);
                  setSol(v);
                }}
                onPickPct={onPickPct}
                onClear={() => {
                  setSolPct(undefined);
                  setSol("");
                }}
                onConnect={() => void onConnect()}
                onLift={onLift}
              />
            ) : null}
            {step === 3 ? (
              <HeartbeatStep
                heartbeatDays={heartbeatDays}
                graceDays={graceDays}
                pauseDays={pauseDays}
                hasGuardian={hasGuardian}
                heartbeatError={heartbeatError}
                graceError={graceError}
                pauseError={pauseError}
                onHeartbeat={setHeartbeatDays}
                onGrace={setGraceDays}
                onPause={setPauseDays}
                onLift={onLift}
              />
            ) : null}
            {step === 4 ? (
              <ReviewStep
                label={label.trim()}
                heirShort={heirShort}
                guardianShort={guardianShort}
                signerShort={signerShort}
                solDisplay={sol.trim() || "0"}
                hasSol={hasSol}
                fundHeir={fundHeir}
                heartbeatDays={heartbeatDays}
                graceDays={graceDays}
                pauseDays={pauseDays}
                acked={acked}
                onEditHeirs={() => setStep(1)}
                onEditAssets={() => setStep(2)}
                onEditTiming={() => setStep(3)}
                onToggleFundHeir={() => setFundHeir((v) => !v)}
                onToggleAck={() => setAcked((v) => !v)}
              />
            ) : null}
          </>
        )}
      </ScrollView>
      </View>
      {errorLine !== undefined && showFooter ? (
        <Text
          style={{
            paddingHorizontal: 20,
            paddingBottom: 8,
            fontFamily: "SpaceGrotesk_600SemiBold",
            fontSize: 14,
            color: colors.claim,
          }}
        >
          {errorLine}
        </Text>
      ) : null}
      {showFooter ? (
        <WizardFooter
          step={step}
          skipAssets={solEmpty && amountError === undefined}
          busy={creating}
          createReady={createReady}
          reason={
            step === 4
              ? reviewReason
              : step === 3
                ? (heartbeatError ?? graceError ?? pauseError)
                : undefined
          }
          continueDimmed={step === 1 && !heirsLooksReady}
          amountBlocked={step === 2 && amountError !== undefined}
          timingBlocked={step === 3 && timingBlocked}
          onBack={() => setStep((s) => Math.max(1, s - 1))}
          onPrimary={() => {
            if (step === 4) void onCreate();
            else goNext();
          }}
        />
      ) : null}
      {keyboardOpen ? null : <FabClearance />}
    </KeyboardAvoidingView>
  );
}

function reviewGate(hasSol: boolean, acked: boolean): string | undefined {
  if (!hasSol) return "Add some SOL first.";
  if (!acked) return "Confirm you understand.";
  return undefined;
}
