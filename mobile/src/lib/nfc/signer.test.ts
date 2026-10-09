import { generateKeyPairSync, sign } from "crypto";
import { describe, expect, test } from "bun:test";
import { getAddressDecoder, type TransactionPartialSigner } from "@solana/kit";

import {
  CardApduError,
  generateApdu,
  getPubApdu,
  INS_GENERATE,
  INS_GET_PUB,
  INS_GET_STATUS,
  INS_SELECT,
  INS_SET_PIN,
  INS_SIGN,
  INS_VERIFY,
  P1_LAST,
  selectApdu,
  SIG_LEN,
  signApdus,
  SW_NO_KEY,
  SW_OK,
  SW_PIN_REQUIRED,
  SW_SLOT_FULL,
  TEST_SIGN_MESSAGE,
  toHex,
} from "./apdu";
import { createCardTransactionSigner } from "./kitSigner";
import type { IsoDepTransceive } from "@/types/nfc";
import {
  generatePubkey,
  readCardIdentity,
  readPubkey,
  runCardSigningSession,
  selectApplet,
  signOnCard,
  signOnCardWithPin,
} from "./signer";

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
    expect(hasKey).toBe(true);
  });

  test("keepAsWallet: GENERATE, SET_PIN, VERIFY, then test SIGN", async () => {
    const { pair, pub } = livePair();
    const sig = Uint8Array.from(sign(undefined, TEST_SIGN_MESSAGE, pair.privateKey));
    const pin = Uint8Array.of(0x31, 0x32, 0x33, 0x34);
    const seen: number[] = [];
    let hasKey = false;
    const tx: IsoDepTransceive = async (apdu) => {
      const ins = insOf(apdu);
      seen.push(ins);
      if (ins === INS_SELECT) return swOnly(SW_OK);
      if (ins === INS_GET_PUB) return hasKey ? reply(pub, SW_OK) : swOnly(SW_NO_KEY);
      if (ins === INS_GENERATE) {
        hasKey = true;
        return reply(pub, SW_OK);
      }
      if (ins === INS_SET_PIN || ins === INS_VERIFY) return swOnly(SW_OK);
      if (ins === INS_SIGN) return reply(sig, SW_OK);
      return swOnly(0x6d00);
    };
    await generatePubkey(tx, undefined, pin);
    expect(seen.filter((ins) => ins === INS_SET_PIN)).toHaveLength(1);
    expect(seen.filter((ins) => ins === INS_VERIFY)).toHaveLength(1);
    expect(seen.indexOf(INS_SET_PIN)).toBeLessThan(seen.indexOf(INS_SIGN));
  });

  test("SET_PIN 6D00 is pin_unsupported", async () => {
    const { pub } = livePair();
    const pin = Uint8Array.of(0x31, 0x32, 0x33, 0x34);
    const tx: IsoDepTransceive = async (apdu) => {
      const ins = insOf(apdu);
      if (ins === INS_SELECT) return swOnly(SW_OK);
      if (ins === INS_GET_PUB) return swOnly(SW_NO_KEY);
      if (ins === INS_GENERATE) return reply(pub, SW_OK);
      if (ins === INS_SET_PIN) return swOnly(0x6d00);
      return swOnly(0x6d00);
    };
    try {
      await generatePubkey(tx, undefined, pin);
      throw new Error("expected throw");
    } catch (cause) {
      expect(cause).toBeInstanceOf(CardApduError);
      if (cause instanceof CardApduError) expect(cause.kind).toBe("pin_unsupported");
    }
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

describe("readCardIdentity", () => {
  test("GET_STATUS 6D00 is a bearer card", async () => {
    const pub = Uint8Array.from({ length: 32 }, (_, i) => i);
    const tx: IsoDepTransceive = async (apdu) => {
      const ins = insOf(apdu);
      if (ins === INS_SELECT) return swOnly(SW_OK);
      if (ins === INS_GET_PUB) return reply(pub, SW_OK);
      return swOnly(0x6d00);
    };
    const id = await readCardIdentity(tx);
    expect(id.pin).toEqual({ kind: "none" });
    expect(toHex(id.pub)).toBe(toHex(pub));
  });

  test("GET_STATUS 6D00 after a drop is retried after SELECT", async () => {
    const pub = Uint8Array.from({ length: 32 }, (_, i) => i);
    let statusTries = 0;
    const tx: IsoDepTransceive = async (apdu) => {
      const ins = insOf(apdu);
      if (ins === INS_SELECT) return swOnly(SW_OK);
      if (ins === INS_GET_PUB) return reply(pub, SW_OK);
      if (ins === INS_GET_STATUS) {
        statusTries += 1;
        if (statusTries === 1) return swOnly(0x6d00);
        return reply(Uint8Array.of(1, 1, 3), SW_OK);
      }
      return swOnly(0x6d00);
    };
    const id = await readCardIdentity(tx);
    expect(id.pin).toEqual({ kind: "set", triesLeft: 3 });
  });

  test("GET_STATUS 010103 is keepAsWallet", async () => {
    const pub = Uint8Array.from({ length: 32 }, (_, i) => i);
    const tx: IsoDepTransceive = async (apdu) => {
      const ins = insOf(apdu);
      if (ins === INS_SELECT) return swOnly(SW_OK);
      if (ins === INS_GET_PUB) return reply(pub, SW_OK);
      return reply(Uint8Array.of(1, 1, 3), SW_OK);
    };
    const id = await readCardIdentity(tx);
    expect(id.pin).toEqual({ kind: "set", triesLeft: 3 });
  });
});

describe("signOnCardWithPin", () => {
  test("VERIFY again after SIGN 6982 (SELECT cleared OwnerPIN)", async () => {
    const sig = Uint8Array.from({ length: SIG_LEN }, (_, i) => i);
    const pin = Uint8Array.of(0x31, 0x32, 0x33, 0x34);
    const seen: number[] = [];
    let unlocked = false;
    const tx: IsoDepTransceive = async (apdu) => {
      const ins = insOf(apdu);
      seen.push(ins);
      if (ins === INS_SELECT) {
        unlocked = false;
        return swOnly(SW_OK);
      }
      if (ins === INS_GET_STATUS) return reply(Uint8Array.of(1, 1, 3), SW_OK);
      if (ins === INS_VERIFY) {
        unlocked = true;
        return swOnly(SW_OK);
      }
      if (ins === INS_SIGN) return unlocked ? reply(sig, SW_OK) : swOnly(SW_PIN_REQUIRED);
      return swOnly(0x6d00);
    };
    expect(toHex(await signOnCardWithPin(tx, TEST_SIGN_MESSAGE, pin))).toBe(toHex(sig));
    expect(seen.filter((ins) => ins === INS_VERIFY)).toHaveLength(1);
    expect(seen.indexOf(INS_SIGN)).toBeLessThan(seen.indexOf(INS_VERIFY));
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

describe("runCardSigningSession", () => {
  test("SELECTs once for two SIGNs", async () => {
    const pub = Uint8Array.from({ length: 32 }, (_, i) => i);
    const sig = Uint8Array.from({ length: SIG_LEN }, (_, i) => i);
    const seen: number[] = [];
    const tx: IsoDepTransceive = async (apdu) => {
      const ins = insOf(apdu);
      seen.push(ins);
      if (ins === INS_SELECT) return swOnly(SW_OK);
      if (ins === INS_GET_PUB) return reply(pub, SW_OK);
      if (ins === INS_GET_STATUS) return reply(Uint8Array.of(1, 0, 0), SW_OK);
      if (ins === INS_SIGN) {
        const last = (apdu[2] ?? 0) === P1_LAST;
        return last ? reply(sig, SW_OK) : swOnly(SW_OK);
      }
      return swOnly(0x6d00);
    };
    type CompiledTx = Parameters<TransactionPartialSigner["signTransactions"]>[0][number];
    const compiled = { messageBytes: Uint8Array.from({ length: 32 }, () => 0x11), signatures: {} } as unknown as CompiledTx;
    await runCardSigningSession(tx, async ({ signer, unlock, pin }) => {
      expect(pin.kind).toBe("none");
      await unlock();
      await signer.signTransactions([compiled, compiled]);
    });
    expect(seen.filter((ins) => ins === INS_SELECT)).toHaveLength(1);
    expect(seen.filter((ins) => ins === INS_SIGN).length).toBeGreaterThan(1);
  });
});

describe("createCardTransactionSigner + transceive", () => {
  test("SIGNs compiled message bytes on the injected card", async () => {
    const { pair, pub } = livePair();
    const message = Uint8Array.from({ length: 64 }, () => 0x33);
    const sig = Uint8Array.from(sign(undefined, message, pair.privateKey));
    const seen: number[] = [];
    const tx: IsoDepTransceive = async (apdu) => {
      const ins = insOf(apdu);
      seen.push(ins);
      if (ins === INS_SIGN) {
        const last = (apdu[2] ?? 0) === P1_LAST;
        return last ? reply(sig, SW_OK) : swOnly(SW_OK);
      }
      return swOnly(0x6d00);
    };
    const cardAddr = getAddressDecoder().decode(pub);
    const signer = createCardTransactionSigner(cardAddr, (bytes) => signOnCard(tx, bytes));
    type CompiledTx = Parameters<TransactionPartialSigner["signTransactions"]>[0][number];
    const compiled = { messageBytes: message, signatures: {} } as unknown as CompiledTx;
    const dicts = await signer.signTransactions([compiled]);
    expect(seen.every((ins) => ins === INS_SIGN)).toBe(true);
    expect(toHex(dicts[0]?.[cardAddr] ?? new Uint8Array())).toBe(toHex(sig));
  });
});

describe("command bytes stay frozen", () => {
  test("SELECT / GET_PUB / GENERATE match prove.sh", () => {
    expect(toHex(selectApdu())).toBe("00A4040006F0455945020100");
    expect(toHex(getPubApdu())).toBe("0002000020");
    expect(toHex(generateApdu())).toBe("0001000020");
  });
});
