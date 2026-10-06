import type { CardApduKind } from "@/types/nfc";

export const APPLET_AID = Uint8Array.of(0xf0, 0x45, 0x59, 0x45, 0x02, 0x01);

export const CLA = 0x00;
export const INS_GENERATE = 0x01;
export const INS_GET_PUB = 0x02;
export const INS_SIGN = 0x03;
export const INS_SELECT = 0xa4;

export const P1_MORE = 0x00;
export const P1_LAST = 0x80;
export const P2 = 0x00;
export const SELECT_P1 = 0x04;

export const CHUNK_MAX = 200;
export const MSG_MAX = 1024;
export const PUB_LEN = 32;
export const SIG_LEN = 64;

export const SW_OK = 0x9000;
export const SW_BAD_LENGTH = 0x6700;
export const SW_SLOT_FULL = 0x6985;
export const SW_TOO_LONG = 0x6a80;
export const SW_BAD_P1P2 = 0x6a86;
export const SW_NO_KEY = 0x6a88;
export const SW_INS = 0x6d00;
export const SW_CLA = 0x6e00;
export const SW_UNKNOWN = 0x6f00;

/** Same 32-byte test vector as `card/prove.sh` SIGN 32. */
export const TEST_SIGN_MESSAGE = Uint8Array.from({ length: PUB_LEN }, () => 0x5a);

export class CardApduError extends Error {
  readonly kind: CardApduKind;
  readonly sw: number;

  constructor(kind: CardApduKind, sw: number) {
    super(kind);
    this.name = "CardApduError";
    this.kind = kind;
    this.sw = sw;
  }
}

export function isCardApduError(cause: unknown): cause is CardApduError {
  return cause instanceof CardApduError;
}

export type ApduReply = {
  sw: number;
  body: Uint8Array;
};

export function parseApdu(raw: Uint8Array): ApduReply {
  if (raw.length < 2) throw new CardApduError("sw", 0);
  const sw = ((raw[raw.length - 2] ?? 0) << 8) | (raw[raw.length - 1] ?? 0);
  return { sw, body: raw.subarray(0, raw.length - 2) };
}

export function errorFromSw(sw: number): CardApduError {
  if (sw === SW_NO_KEY) return new CardApduError("no_key", sw);
  if (sw === SW_SLOT_FULL) return new CardApduError("slot_full", sw);
  return new CardApduError("sw", sw);
}

export function selectApdu(): Uint8Array {
  const out = new Uint8Array(6 + APPLET_AID.length);
  out[0] = CLA;
  out[1] = INS_SELECT;
  out[2] = SELECT_P1;
  out[3] = P2;
  out[4] = APPLET_AID.length;
  out.set(APPLET_AID, 5);
  out[5 + APPLET_AID.length] = 0x00;
  return out;
}

export function generateApdu(): Uint8Array {
  return Uint8Array.of(CLA, INS_GENERATE, 0x00, P2, PUB_LEN);
}

export function getPubApdu(): Uint8Array {
  return Uint8Array.of(CLA, INS_GET_PUB, 0x00, P2, PUB_LEN);
}

export function signApdus(message: Uint8Array): Uint8Array[] {
  if (message.length === 0) throw new CardApduError("sw", SW_BAD_LENGTH);
  if (message.length > MSG_MAX) throw new CardApduError("sw", SW_TOO_LONG);
  const out: Uint8Array[] = [];
  let offset = 0;
  while (offset < message.length) {
    const end = Math.min(offset + CHUNK_MAX, message.length);
    const last = end >= message.length;
    out.push(signChunk(message.subarray(offset, end), last));
    offset = end;
  }
  return out;
}

function signChunk(chunk: Uint8Array, last: boolean): Uint8Array {
  const out = new Uint8Array(5 + chunk.length);
  out[0] = CLA;
  out[1] = INS_SIGN;
  out[2] = last ? P1_LAST : P1_MORE;
  out[3] = P2;
  out[4] = chunk.length;
  out.set(chunk, 5);
  return out;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}
