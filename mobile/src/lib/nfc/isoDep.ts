import { Platform } from "react-native";
import NfcManager, { NfcAdapter, NfcTech } from "react-native-nfc-manager";

import { isLostField } from "./messages";
import { errorMessage, isUserCancel } from "../text";
import type { IsoDepTransceive } from "@/types/nfc";

export const ISODEP_TIMEOUT_MS = 10_000;
/** Claim then sweep signs more than one tx while the field is up. */
export const ISODEP_CLAIM_TIMEOUT_MS = 45_000;
export const NFC_PRESENCE_CHECK_MS = 2000;
/** Pause after a failed APDU before retrying on a weak couple. */
export const NFC_SETTLE_MS = 150;
/** Let a dest Dialog unmount before reader mode, or IsoDep dies after the chime. */
export const NFC_UI_SETTLE_MS = 400;
/** Weak first coupling (case, off-antenna) often needs another listen. */
export const NFC_COUPLE_TRIES = 4;
/** SELECT/SIGN dying with "transceive fail" after the detect chime. Reconnect, don't abort. */
export const NFC_APDU_TRIES = 3;
/** Some controllers reject IsoDep.setTimeout above ~5s. Session length stays 45s. */
const ISODEP_NATIVE_TIMEOUT_MS = 5_000;

const ISODEP_READER = {
  isReaderModeEnabled: true,
  readerModeFlags:
    NfcAdapter.FLAG_READER_NFC_A |
    NfcAdapter.FLAG_READER_NFC_B |
    NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
  readerModeDelay: NFC_PRESENCE_CHECK_MS,
};

let started = false;
let holdWanted = false;
let nfcBusy = 0;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function nfcWarn(step: string, detail?: unknown): void {
  if (detail === undefined) {
    console.warn(`[nfc] ${step}`);
    return;
  }
  if (detail instanceof Error) {
    console.warn(`[nfc] ${step}: ${errorMessage(detail, detail.name)}`);
    return;
  }
  console.warn(`[nfc] ${step}: ${String(detail)}`);
}

async function applyIsoDepTimeout(timeoutMs: number): Promise<void> {
  await NfcManager.setTimeout(Math.min(timeoutMs, ISODEP_NATIVE_TIMEOUT_MS));
}

export async function ensureNfcStarted(): Promise<void> {
  if (started) return;
  await NfcManager.start();
  started = true;
}

async function registerHold(): Promise<void> {
  await ensureNfcStarted();
  await NfcManager.registerTagEvent({ ...ISODEP_READER });
}

/**
 * Android toasts "No supported application for this NFC tag" when a card is
 * seen and reader mode is off. Hold the same reader flags as a scan for the
 * whole time the app is in the foreground, so the system never dispatches it.
 */
export async function armNfcHold(): Promise<void> {
  if (Platform.OS !== "android") return;
  holdWanted = true;
  if (nfcBusy > 0) return;
  await registerHold().catch((cause: unknown) => nfcWarn("hold", cause));
}

export async function releaseNfcHold(): Promise<void> {
  if (Platform.OS !== "android") return;
  holdWanted = false;
  if (nfcBusy > 0) return;
  await NfcManager.unregisterTagEvent().catch(() => undefined);
}

async function restoreNfcHold(): Promise<void> {
  if (Platform.OS !== "android" || nfcBusy > 0) return;
  if (!holdWanted) {
    await NfcManager.unregisterTagEvent().catch(() => undefined);
    return;
  }
  await registerHold().catch((cause: unknown) => nfcWarn("hold", cause));
}

/** One NFC owner at a time. The foreground hold comes back when `run` finishes. */
export async function withNfcField<T>(run: () => Promise<T>): Promise<T> {
  nfcBusy += 1;
  try {
    return await run();
  } finally {
    nfcBusy -= 1;
    await restoreNfcHold();
  }
}

export async function cancelScan(): Promise<void> {
  await NfcManager.cancelTechnologyRequest({ delayMsAndroid: 0 }).catch(() => undefined);
  if (Platform.OS !== "android") {
    await NfcManager.unregisterTagEvent().catch(() => undefined);
    return;
  }
  await restoreNfcHold();
}

async function reconnectIsoDep(timeoutMs: number): Promise<void> {
  nfcWarn("reconnect IsoDep");
  await NfcManager.close().catch(() => undefined);
  await NfcManager.connect([NfcTech.IsoDep]);
  await applyIsoDepTimeout(timeoutMs);
}

async function recoverApdu(attempt: number, timeoutMs: number): Promise<void> {
  if (attempt === 0) {
    await wait(NFC_SETTLE_MS);
    return;
  }
  await reconnectIsoDep(timeoutMs);
  await wait(NFC_SETTLE_MS);
}

async function transceiveApdu(apdu: Uint8Array, timeoutMs: number): Promise<Uint8Array> {
  let last: unknown;
  for (let attempt = 0; attempt < NFC_APDU_TRIES; attempt++) {
    try {
      const raw = await NfcManager.isoDepHandler.transceive([...apdu]);
      const out = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) out[i] = (raw[i] ?? 0) & 0xff;
      return out;
    } catch (cause) {
      last = cause;
      nfcWarn(`transceive ${attempt + 1}/${NFC_APDU_TRIES}`, cause);
      if (isUserCancel(cause) || !isLostField(cause) || attempt === NFC_APDU_TRIES - 1) {
        throw cause;
      }
      await recoverApdu(attempt, timeoutMs);
    }
  }
  throw last;
}

async function runIsoDepSession<T>(
  run: (tx: IsoDepTransceive) => Promise<T>,
  timeoutMs: number,
  alertMessage: string,
): Promise<T> {
  try {
    const connected = await NfcManager.requestTechnology(NfcTech.IsoDep, {
      alertMessage,
      ...ISODEP_READER,
    });
    if (connected !== NfcTech.IsoDep) {
      nfcWarn("requestTechnology", connected);
      throw new Error("not connected");
    }
    await applyIsoDepTimeout(timeoutMs);
    return await run((apdu) => transceiveApdu(apdu, timeoutMs));
  } finally {
    await cancelScan();
  }
}

export async function withIsoDep<T>(
  run: (tx: IsoDepTransceive) => Promise<T>,
  timeoutMs = ISODEP_TIMEOUT_MS,
  alertMessage = "Hold the credential to the phone",
): Promise<T> {
  return withNfcField(() => listenIsoDep(run, timeoutMs, alertMessage));
}

async function listenIsoDep<T>(
  run: (tx: IsoDepTransceive) => Promise<T>,
  timeoutMs: number,
  alertMessage: string,
): Promise<T> {
  await ensureNfcStarted();
  let last: unknown;
  for (let attempt = 0; attempt < NFC_COUPLE_TRIES; attempt++) {
    try {
      return await runIsoDepSession(run, timeoutMs, alertMessage);
    } catch (cause) {
      last = cause;
      if (isUserCancel(cause) || !isLostField(cause) || attempt === NFC_COUPLE_TRIES - 1) {
        if (!isUserCancel(cause)) nfcWarn("session", cause);
        throw cause;
      }
      nfcWarn(`couple retry ${attempt + 1}/${NFC_COUPLE_TRIES}`, cause);
    }
  }
  throw last;
}
