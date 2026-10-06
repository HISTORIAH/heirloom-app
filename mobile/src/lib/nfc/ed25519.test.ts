import { generateKeyPairSync, sign } from "crypto";
import { describe, expect, test } from "bun:test";

import { TEST_SIGN_MESSAGE } from "./apdu";
import { verifyEd25519 } from "./ed25519";

function derPubToRaw(der: Buffer): Uint8Array {
  return Uint8Array.from(der.subarray(der.length - 32));
}

describe("verifyEd25519", () => {
  test("empty message and 32-byte 0x5A, live key", () => {
    const pair = generateKeyPairSync("ed25519");
    const pub = derPubToRaw(pair.publicKey.export({ type: "spki", format: "der" }));
    const empty = new Uint8Array();
    expect(verifyEd25519(pub, empty, sign(undefined, empty, pair.privateKey))).toBe(true);
    const sig = sign(undefined, TEST_SIGN_MESSAGE, pair.privateKey);
    expect(verifyEd25519(pub, TEST_SIGN_MESSAGE, sig)).toBe(true);
    const bad = Uint8Array.from(sig);
    bad[0] = (bad[0] ?? 0) ^ 0xff;
    expect(verifyEd25519(pub, TEST_SIGN_MESSAGE, bad)).toBe(false);
  });
});
