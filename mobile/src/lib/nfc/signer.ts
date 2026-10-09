import { getAddressDecoder, type Address } from "@solana/kit";

import {
  CardApduError,
  errorFromSw,
  generateApdu,
  getPubApdu,
  getStatusApdu,
  INS_SIGN,
  isCardApduError,
  parseApdu,
  PUB_LEN,
  selectApdu,
  setPinApdu,
  SIG_LEN,
  signApdus,
  SW_INS,
  SW_NO_KEY,
  SW_OK,
  SW_PIN_BLOCKED,
  SW_PIN_REQUIRED,
  SW_SLOT_FULL,
  TEST_SIGN_MESSAGE,
  verifyPinApdu,
} from "./apdu";
import { parsePinStatus } from "./pin";
import { verifyEd25519 } from "./ed25519";
import { createCardTransactionSigner } from "./kitSigner";
import type { TapProgress } from "@/types/create";
import type { CardSigningSession, HardwareSigner, IsoDepTransceive, PinStatus } from "@/types/nfc";

const addressOf = getAddressDecoder();

type PubSlot = { kind: "empty" } | { kind: "some"; value: Uint8Array };

export async function selectApplet(tx: IsoDepTransceive): Promise<void> {
  const { sw } = parseApdu(await tx(selectApdu()));
  if (sw !== SW_OK) throw new CardApduError("not_heirloom", sw);
}

async function readPubSlot(tx: IsoDepTransceive): Promise<PubSlot> {
  const { sw, body } = parseApdu(await tx(getPubApdu()));
  if (sw === SW_NO_KEY) return { kind: "empty" };
  if (sw !== SW_OK) throw errorFromSw(sw);
  if (body.length !== PUB_LEN) throw new CardApduError("sw", sw);
  return { kind: "some", value: body };
}

async function generateOnCard(tx: IsoDepTransceive): Promise<Uint8Array> {
  const { sw, body } = parseApdu(await tx(generateApdu()));
  if (sw === SW_SLOT_FULL) throw new CardApduError("slot_full", sw);
  if (sw !== SW_OK) throw errorFromSw(sw);
  if (body.length !== PUB_LEN) throw new CardApduError("sw", sw);
  return body;
}

export async function readPinStatus(tx: IsoDepTransceive): Promise<PinStatus> {
  const { sw, body } = parseApdu(await tx(getStatusApdu()));
  if (sw === SW_INS) return { kind: "none" };
  if (sw !== SW_OK) throw errorFromSw(sw);
  return parsePinStatus(body);
}

async function setPinOnCard(tx: IsoDepTransceive, pin: Uint8Array): Promise<void> {
  const { sw } = parseApdu(await tx(setPinApdu(pin)));
  if (sw === SW_INS) throw new CardApduError("pin_unsupported", sw);
  if (sw !== SW_OK) throw errorFromSw(sw);
}

async function verifyPin(tx: IsoDepTransceive, pin: Uint8Array): Promise<void> {
  const { sw } = parseApdu(await tx(verifyPinApdu(pin)));
  if (sw !== SW_OK) throw errorFromSw(sw);
}

async function unlockIfNeeded(
  tx: IsoDepTransceive,
  status: PinStatus,
  pin: Uint8Array | undefined,
): Promise<void> {
  if (status.kind === "none") return;
  if (status.kind === "blocked") throw new CardApduError("pin_blocked", SW_PIN_BLOCKED);
  if (pin === undefined) throw new CardApduError("pin_required", SW_PIN_REQUIRED);
  await verifyPin(tx, pin);
}

/**
 * IsoDep reconnect deselects the applet. Retrying GET_STATUS/SET_PIN then
 * returns ISD 6D00. SELECT once and retry; VERIFY again only for 6982.
 */
export function withAppletRestore(tx: IsoDepTransceive, pin?: Uint8Array): IsoDepTransceive {
  return async (apdu) => {
    const out = await tx(apdu);
    const ins = apdu[1] ?? 0;
    if (ins === INS_SIGN) return out;
    const { sw } = parseApdu(out);
    if (sw !== SW_INS && sw !== SW_PIN_REQUIRED) return out;
    await selectApplet(tx);
    if (sw === SW_PIN_REQUIRED) {
      await unlockIfNeeded(tx, await readPinStatus(tx), pin);
    }
    return tx(apdu);
  };
}

export async function signOnCard(tx: IsoDepTransceive, message: Uint8Array): Promise<Uint8Array> {
  const chunks = signApdus(message);
  let last: { sw: number; body: Uint8Array } = { sw: SW_OK, body: new Uint8Array() };
  for (const apdu of chunks) {
    last = parseApdu(await tx(apdu));
    if (last.sw !== SW_OK) throw errorFromSw(last.sw);
  }
  if (last.body.length !== SIG_LEN) throw new CardApduError("sw", last.sw);
  return last.body;
}

/** SIGN and if SELECT wiped OwnerPIN, VERIFY again from the PIN still in hand. */
export async function signOnCardWithPin(
  tx: IsoDepTransceive,
  message: Uint8Array,
  pin?: Uint8Array,
): Promise<Uint8Array> {
  try {
    return await signOnCard(tx, message);
  } catch (cause) {
    if (!isCardApduError(cause) || cause.kind !== "pin_required") throw cause;
    await selectApplet(tx);
    await unlockIfNeeded(tx, await readPinStatus(tx), pin);
    return signOnCard(tx, message);
  }
}

export async function readPubkey(tx: IsoDepTransceive): Promise<Uint8Array> {
  await selectApplet(tx);
  const slot = await readPubSlot(withAppletRestore(tx));
  if (slot.kind === "empty") throw new CardApduError("no_key", SW_NO_KEY);
  return slot.value;
}

export async function readCardIdentity(
  tx: IsoDepTransceive,
): Promise<{ pub: Uint8Array; pin: PinStatus }> {
  await selectApplet(tx);
  const send = withAppletRestore(tx);
  const slot = await readPubSlot(send);
  if (slot.kind === "empty") throw new CardApduError("no_key", SW_NO_KEY);
  const pin = await readPinStatus(send);
  return { pub: slot.value, pin };
}

export async function generatePubkey(
  tx: IsoDepTransceive,
  onProgress?: (progress: TapProgress) => void,
  pin?: Uint8Array,
): Promise<Uint8Array> {
  await selectApplet(tx);
  const send = withAppletRestore(tx, pin);
  const slot = await readPubSlot(send);
  if (slot.kind === "some") throw new CardApduError("slot_full", SW_SLOT_FULL);
  onProgress?.("found");
  const pub = await generateOnCard(send);
  if (pin !== undefined) {
    await setPinOnCard(send, pin);
    await verifyPin(send, pin);
  }
  const sig = await signOnCardWithPin(send, TEST_SIGN_MESSAGE, pin);
  if (!verifyEd25519(pub, TEST_SIGN_MESSAGE, sig)) {
    throw new Error("The card’s test signature did not verify.");
  }
  onProgress?.("done");
  return pub;
}

async function signSession(
  tx: IsoDepTransceive,
  message: Uint8Array,
  pin?: Uint8Array,
): Promise<Uint8Array> {
  await selectApplet(tx);
  const send = withAppletRestore(tx, pin);
  const status = await readPinStatus(send);
  await unlockIfNeeded(send, status, pin);
  return signOnCardWithPin(send, message, pin);
}

function addressFromPubkey(pub: Uint8Array): Address {
  return addressOf.decode(pub);
}

async function onCard<T>(run: (tx: IsoDepTransceive) => Promise<T>): Promise<T> {
  const { withIsoDep } = await import("./isoDep");
  return withIsoDep(run);
}

/** SELECT + GET_PUB once. Caller VERIFYs via `unlock` then SIGNs without re-SELECT. */
export async function runCardSigningSession<T>(
  tx: IsoDepTransceive,
  run: (session: CardSigningSession) => Promise<T>,
  pin?: Uint8Array,
): Promise<T> {
  await selectApplet(tx);
  const send = withAppletRestore(tx, pin);
  const slot = await readPubSlot(send);
  if (slot.kind === "empty") throw new CardApduError("no_key", SW_NO_KEY);
  const status = await readPinStatus(send);
  const address = addressFromPubkey(slot.value);
  const signer = createCardTransactionSigner(address, (message) =>
    signOnCardWithPin(send, message, pin),
  );
  return run({
    address,
    signer,
    pin: status,
    unlock: () => unlockIfNeeded(send, status, pin),
  });
}

export async function withCardSigningSession<T>(
  run: (session: CardSigningSession) => Promise<T>,
  pin?: Uint8Array,
): Promise<T> {
  const { ISODEP_CLAIM_TIMEOUT_MS, withIsoDep } = await import("./isoDep");
  return withIsoDep(
    (tx) => runCardSigningSession(tx, run, pin),
    ISODEP_CLAIM_TIMEOUT_MS,
    "Hold the credential still until sending finishes.",
  );
}

export async function scanCardIdentity(): Promise<{ address: Address; pin: PinStatus }> {
  const { pub, pin } = await onCard(readCardIdentity);
  return { address: addressFromPubkey(pub), pin };
}

export function createNfcJavaCardSigner(): HardwareSigner {
  return {
    async getPublicKey() {
      return addressFromPubkey(await onCard(readPubkey));
    },
    async generateKeypair(onProgress, pin) {
      return addressFromPubkey(await onCard((tx) => generatePubkey(tx, onProgress, pin)));
    },
    async signBytes(message) {
      return onCard((tx) => signSession(tx, message));
    },
  };
}
