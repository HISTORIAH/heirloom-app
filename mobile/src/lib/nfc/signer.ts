import { getAddressDecoder, type Address } from "@solana/kit";

import {
  CardApduError,
  errorFromSw,
  generateApdu,
  getPubApdu,
  parseApdu,
  PUB_LEN,
  selectApdu,
  SIG_LEN,
  signApdus,
  SW_NO_KEY,
  SW_OK,
  SW_SLOT_FULL,
  TEST_SIGN_MESSAGE,
} from "./apdu";
import { verifyEd25519 } from "./ed25519";
import { createCardTransactionSigner } from "./kitSigner";
import type { TapProgress } from "@/types/create";
import type { CardSigningSession, HardwareSigner, IsoDepTransceive } from "@/types/nfc";

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

export async function readPubkey(tx: IsoDepTransceive): Promise<Uint8Array> {
  await selectApplet(tx);
  const slot = await readPubSlot(tx);
  if (slot.kind === "empty") throw new CardApduError("no_key", SW_NO_KEY);
  return slot.value;
}

export async function generatePubkey(
  tx: IsoDepTransceive,
  onProgress?: (progress: TapProgress) => void,
): Promise<Uint8Array> {
  await selectApplet(tx);
  const slot = await readPubSlot(tx);
  if (slot.kind === "some") throw new CardApduError("slot_full", SW_SLOT_FULL);
  onProgress?.("found");
  const pub = await generateOnCard(tx);
  const sig = await signOnCard(tx, TEST_SIGN_MESSAGE);
  if (!verifyEd25519(pub, TEST_SIGN_MESSAGE, sig)) {
    throw new Error("The card’s test signature did not verify.");
  }
  onProgress?.("done");
  return pub;
}

async function signSession(tx: IsoDepTransceive, message: Uint8Array): Promise<Uint8Array> {
  await selectApplet(tx);
  return signOnCard(tx, message);
}

function addressFromPubkey(pub: Uint8Array): Address {
  return addressOf.decode(pub);
}

async function onCard<T>(run: (tx: IsoDepTransceive) => Promise<T>): Promise<T> {
  const { withIsoDep } = await import("./isoDep");
  return withIsoDep(run);
}

/** SELECT + GET_PUB once, then SIGN each compiled tx on the same field. */
export async function withCardSigningSession<T>(
  run: (session: CardSigningSession) => Promise<T>,
): Promise<T> {
  const { ISODEP_CLAIM_TIMEOUT_MS, withIsoDep } = await import("./isoDep");
  return withIsoDep(
    async (tx) => {
      const pub = await readPubkey(tx);
      const address = addressFromPubkey(pub);
      const signer = createCardTransactionSigner(address, async (message) => {
        await selectApplet(tx);
        return signOnCard(tx, message);
      });
      return run({ address, signer });
    },
    ISODEP_CLAIM_TIMEOUT_MS,
    "Hold the credential still until sending finishes.",
  );
}

export function createNfcJavaCardSigner(): HardwareSigner {
  return {
    async getPublicKey() {
      return addressFromPubkey(await onCard(readPubkey));
    },
    async generateKeypair(onProgress) {
      return addressFromPubkey(await onCard((tx) => generatePubkey(tx, onProgress)));
    },
    async signBytes(message) {
      return onCard((tx) => signSession(tx, message));
    },
  };
}
