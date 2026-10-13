import { TurboModuleRegistry } from "react-native";
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

export async function cancelScan(): Promise<void> {
  await NfcManager.cancelTechnologyRequest({ delayMsAndroid: 0 }).catch(() => undefined);
  await NfcManager.unregisterTagEvent().catch(() => undefined);
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

/*
 * TODO(nfc): replace the native requestTechnology workaround below with the public API.
 *
 * nfc-manager 4 (bumped in #174) changed `readerModeDelay` from seconds to milliseconds,
 * so our old value of 2 became a 2ms presence check and cards dropped mid-session.
 * NFC_PRESENCE_CHECK_MS = 2000 is the actual fix (#188).
 *
 * #188 also stopped calling `NfcManager.requestTechnology` and reached the native
 * module through TurboModuleRegistry with 2 args; the v4 native method takes 3
 * (techs, options, callback), so #189 catches the arity error and retries with 3.
 * Neither should be needed: in v4 the public call is
 *   NfcManager.requestTechnology(NfcTech.IsoDep, { alertMessage, ...ISODEP_READER })
 * which passes all 3 args and registers the tag event itself. It also wraps native
 * errors (UserCancel etc.); here cancel is only recognised because isUserCancel's
 * regex happens to match the string "cancelled".
 *
 * Not reverted yet because it is untested on hardware: Tangem cards worked for us,
 * but the JavaCard JCOP 4 (our applet) path is the one that failed. Revert
 * requestIsoDep / isRequestTechArity / nfcRequestTechnology and the manual
 * register/unregisterTagEvent, keep NFC_PRESENCE_CHECK_MS, then test scan, PIN unlock,
 * claim + sweep (45s session) and cancel on a JCOP 4 card and a Tangem card.
 */
function isRequestTechArity(cause: unknown): boolean {
  const text = errorMessage(cause, "");
  return text.includes("requestTechnology") && text.includes("expected argument count");
}

function nfcRequestTechnology(): (...args: unknown[]) => unknown {
  const native = TurboModuleRegistry.getEnforcing("NfcManager");
  const fn = Reflect.get(native, "requestTechnology");
  if (typeof fn !== "function") {
    throw new Error("NFC native requestTechnology missing");
  }
  return fn.bind(native);
}

function requestIsoDep(): Promise<string | undefined> {
  const requestTechnology = nfcRequestTechnology();
  const techs = [NfcTech.IsoDep];
  return new Promise((resolve, reject) => {
    const finish = (error?: string, tech?: string) => {
      if (typeof error === "string" && error.length > 0) {
        reject(new Error(error));
        return;
      }
      resolve(tech);
    };
    try {
      requestTechnology(techs, finish);
    } catch (cause) {
      if (!isRequestTechArity(cause)) {
        reject(cause instanceof Error ? cause : new Error(errorMessage(cause, "NFC request failed")));
        return;
      }
      try {
        requestTechnology(techs, {}, finish);
      } catch (retry) {
        reject(retry instanceof Error ? retry : new Error(errorMessage(retry, "NFC request failed")));
      }
    }
  });
}

async function runIsoDepSession<T>(
  run: (tx: IsoDepTransceive) => Promise<T>,
  timeoutMs: number,
  alertMessage: string,
): Promise<T> {
  try {
    await NfcManager.registerTagEvent({ alertMessage, ...ISODEP_READER });
    const connected = await requestIsoDep();
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
