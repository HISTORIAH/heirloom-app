import { verify } from "crypto";

const SPKI_PREFIX = Uint8Array.of(
  0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
);

/** RFC 8032 Ed25519 verify. Same check as `card/verify.mjs`. */
export function verifyEd25519(pub: Uint8Array, message: Uint8Array, sig: Uint8Array): boolean {
  if (pub.length !== 32 || sig.length !== 64) return false;
  const key = Buffer.concat([Buffer.from(SPKI_PREFIX), Buffer.from(pub)]);
  return verify(undefined, Buffer.from(message), { key, format: "der", type: "spki" }, Buffer.from(sig));
}
