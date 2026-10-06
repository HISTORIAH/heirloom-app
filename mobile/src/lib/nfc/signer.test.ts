import { generateKeyPairSync, sign } from "crypto";
import { describe, expect, test } from "bun:test";

import {
  CardApduError,
  generateApdu,
  getPubApdu,
  INS_GENERATE,
  INS_GET_PUB,
  INS_SELECT,
  INS_SIGN,
  P1_LAST,
  selectApdu,
  SIG_LEN,
  signApdus,
  SW_NO_KEY,
  SW_OK,
  SW_SLOT_FULL,
  TEST_SIGN_MESSAGE,
  toHex,
} from "./apdu";
import type { IsoDepTransceive } from "@/types/nfc";
import { generatePubkey, readPubkey, selectApplet, signOnCard } from "./signer";

function derPubToRaw(der: Buffer): Uint8Array {
  return Uint8Array.from(der.subarray(der.length - 32));
}

function reply(body: Uint8Array, sw: number): Uint8Array {
  const out = new Uint8Array(body.length + 2);
  out.set(body);
  out[body.length] = (sw >> 8) & 0xff;
  out[body.length + 1] = sw & 0xff;
  return out;
}

function swOnly(sw: number): Uint8Array {
  return reply(new Uint8Array(), sw);
}

function insOf(apdu: Uint8Array): number {
  return apdu[1] ?? 0;
}

function livePair() {
  const pair = generateKeyPairSync("ed25519");
  const pub = derPubToRaw(pair.publicKey.export({ type: "spki", format: "der" }));
  return { pair, pub };
}

describe("selectApplet", () => {
  test("9000 is ok, anything else is not_heirloom", async () => {
    await selectApplet(async () => swOnly(SW_OK));
    try {
      await selectApplet(async () => swOnly(0x6a82));
      throw new Error("expected throw");
    } catch (cause) {
      expect(cause).toBeInstanceOf(CardApduError);
      if (cause instanceof CardApduError) expect(cause.kind).toBe("not_heirloom");
    }
  });
});

describe("readPubkey", () => {
  test("empty slot is no_key", async () => {
    const tx: IsoDepTransceive = async (apdu) => {
      if (insOf(apdu) === INS_SELECT) return swOnly(SW_OK);
      return swOnly(SW_NO_KEY);
    };
    try {
      await readPubkey(tx);
      throw new Error("expected throw");
    } catch (cause) {
      expect(cause).toBeInstanceOf(CardApduError);
      if (cause instanceof CardApduError) expect(cause.kind).toBe("no_key");
    }
  });

  test("occupied slot returns 32 bytes", async () => {
    const pub = Uint8Array.from({ length: 32 }, (_, i) => i);
    const tx: IsoDepTransceive = async (apdu) => {
      if (insOf(apdu) === INS_SELECT) return swOnly(SW_OK);
      return reply(pub, SW_OK);
    };
    expect(toHex(await readPubkey(tx))).toBe(toHex(pub));
  });
});

describe("generatePubkey", () => {
  test("blank card: GET_PUB 6A88, GENERATE, SIGN, found then done", async () => {
    const { pair, pub } = livePair();
    const sig = Uint8Array.from(sign(undefined, TEST_SIGN_MESSAGE, pair.privateKey));
    const progress: string[] = [];
    let hasKey = false;
    const tx: IsoDepTransceive = async (apdu) => {
      const ins = insOf(apdu);
      if (ins === INS_SELECT) return swOnly(SW_OK);
      if (ins === INS_GET_PUB) return hasKey ? reply(pub, SW_OK) : swOnly(SW_NO_KEY);
      if (ins === INS_GENERATE) {
        hasKey = true;
        return reply(pub, SW_OK);
      }
      if (ins === INS_SIGN) return reply(sig, SW_OK);
      return swOnly(0x6d00);
    };
    const out = await generatePubkey(tx, (p) => progress.push(p));
    expect(toHex(out)).toBe(toHex(pub));
    expect(progress).toEqual(["found", "done"]);
  });

  test("occupied card is slot_full, no GENERATE", async () => {
    const pub = Uint8Array.from({ length: 32 }, () => 0x11);
    let generated = false;
    const tx: IsoDepTransceive = async (apdu) => {
      if (insOf(apdu) === INS_SELECT) return swOnly(SW_OK);
      if (insOf(apdu) === INS_GET_PUB) return reply(pub, SW_OK);
      if (insOf(apdu) === INS_GENERATE) {
        generated = true;
        return swOnly(SW_SLOT_FULL);
      }
      return swOnly(0x6d00);
    };
    try {
      await generatePubkey(tx);
      throw new Error("expected throw");
    } catch (cause) {
      expect(cause).toBeInstanceOf(CardApduError);
      if (cause instanceof CardApduError) expect(cause.kind).toBe("slot_full");
    }
    expect(generated).toBe(false);
  });

  test("bad test signature fails", async () => {
    const { pub } = livePair();
    const tx: IsoDepTransceive = async (apdu) => {
      if (insOf(apdu) === INS_SELECT) return swOnly(SW_OK);
      if (insOf(apdu) === INS_GET_PUB) return swOnly(SW_NO_KEY);
      if (insOf(apdu) === INS_GENERATE) return reply(pub, SW_OK);
      return reply(Uint8Array.from({ length: SIG_LEN }, () => 0x00), SW_OK);
    };
    await expect(generatePubkey(tx)).rejects.toThrow("test signature");
  });
});

describe("signOnCard", () => {
  test("512-byte message sends three chunks", async () => {
    const msg = Uint8Array.from({ length: 512 }, () => 0x22);
    const expected = signApdus(msg).map(toHex);
    const seen: string[] = [];
    const sig = Uint8Array.from({ length: SIG_LEN }, (_, i) => i);
    const tx: IsoDepTransceive = async (apdu) => {
      seen.push(toHex(apdu));
      const last = (apdu[2] ?? 0) === P1_LAST;
      return last ? reply(sig, SW_OK) : swOnly(SW_OK);
    };
    expect(toHex(await signOnCard(tx, msg))).toBe(toHex(sig));
    expect(seen).toEqual(expected);
  });
});

describe("command bytes stay frozen", () => {
  test("SELECT / GET_PUB / GENERATE match prove.sh", () => {
    expect(toHex(selectApdu())).toBe("00A4040006F0455945020100");
    expect(toHex(getPubApdu())).toBe("0002000020");
    expect(toHex(generateApdu())).toBe("0001000020");
  });
});
