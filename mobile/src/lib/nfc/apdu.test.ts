import { describe, expect, test } from "bun:test";

import {
  APPLET_AID,
  CardApduError,
  CHUNK_MAX,
  errorFromSw,
  generateApdu,
  getPubApdu,
  getStatusApdu,
  isPinTriesSw,
  MSG_MAX,
  parseApdu,
  pinTriesLeft,
  selectApdu,
  setPinApdu,
  signApdus,
  SW_NO_KEY,
  SW_OK,
  SW_PIN_BLOCKED,
  SW_PIN_REQUIRED,
  SW_SLOT_FULL,
  SW_TOO_LONG,
  TEST_SIGN_MESSAGE,
  toHex,
  verifyPinApdu,
} from "./apdu";

describe("selectApdu", () => {
  test("SELECT by AID with Le 00, matching card/prove.sh", () => {
    expect(toHex(selectApdu())).toBe("00A4040006F0455945020100");
    expect(toHex(APPLET_AID)).toBe("F04559450201");
  });
});

describe("case-2 commands", () => {
  test("GET_PUB and GENERATE ask for 32 bytes", () => {
    expect(toHex(getPubApdu())).toBe("0002000020");
    expect(toHex(generateApdu())).toBe("0001000020");
  });

  test("GET_STATUS asks for 3 bytes", () => {
    expect(toHex(getStatusApdu())).toBe("0006000003");
  });
});

describe("PIN commands", () => {
  test("SET_PIN and VERIFY carry ASCII digits and no Le", () => {
    const pin = Uint8Array.of(0x31, 0x32, 0x33, 0x34);
    expect(toHex(setPinApdu(pin))).toBe("000400000431323334");
    expect(toHex(verifyPinApdu(pin))).toBe("000500000431323334");
  });
});

describe("signApdus", () => {
  test("32-byte last chunk only", () => {
    const [only] = signApdus(TEST_SIGN_MESSAGE);
    expect(signApdus(TEST_SIGN_MESSAGE)).toHaveLength(1);
    expect(toHex(only ?? new Uint8Array())).toBe("0003800020" + "5A".repeat(32));
  });

  test("200-byte last chunk only", () => {
    const msg = Uint8Array.from({ length: CHUNK_MAX }, () => 0x11);
    expect(signApdus(msg)).toHaveLength(1);
    expect(toHex(signApdus(msg)[0] ?? new Uint8Array()).startsWith("00038000C8")).toBe(true);
  });

  test("512 is 200 + 200 + 112, last P1 80", () => {
    const msg = Uint8Array.from({ length: 512 }, () => 0x22);
    const chunks = signApdus(msg);
    expect(chunks).toHaveLength(3);
    expect(toHex(chunks[0] ?? new Uint8Array()).startsWith("00030000C8")).toBe(true);
    expect(toHex(chunks[1] ?? new Uint8Array()).startsWith("00030000C8")).toBe(true);
    expect(toHex(chunks[2] ?? new Uint8Array()).startsWith("0003800070")).toBe(true);
    expect((chunks[0] ?? new Uint8Array()).length).toBe(5 + 200);
    expect((chunks[2] ?? new Uint8Array()).length).toBe(5 + 112);
  });

  test("empty and oversize fail before send", () => {
    expect(() => signApdus(new Uint8Array())).toThrow(CardApduError);
    expect(() => signApdus(new Uint8Array(MSG_MAX + 1))).toThrow(CardApduError);
    try {
      signApdus(new Uint8Array(MSG_MAX + 1));
    } catch (cause) {
      expect(cause).toBeInstanceOf(CardApduError);
      if (cause instanceof CardApduError) expect(cause.sw).toBe(SW_TOO_LONG);
    }
  });
});

describe("parseApdu", () => {
  test("9000 with 32-byte body", () => {
    const raw = Uint8Array.of(...Array.from({ length: 32 }, () => 0xab), 0x90, 0x00);
    const parsed = parseApdu(raw);
    expect(parsed.sw).toBe(SW_OK);
    expect(parsed.body.length).toBe(32);
    expect(parsed.body[0]).toBe(0xab);
  });

  test("6A88 empty body", () => {
    const parsed = parseApdu(Uint8Array.of(0x6a, 0x88));
    expect(parsed.sw).toBe(SW_NO_KEY);
    expect(parsed.body.length).toBe(0);
  });

  test("short reply", () => {
    expect(() => parseApdu(Uint8Array.of(0x90))).toThrow(CardApduError);
  });
});

describe("errorFromSw", () => {
  test("maps known status words", () => {
    expect(errorFromSw(SW_NO_KEY).kind).toBe("no_key");
    expect(errorFromSw(SW_SLOT_FULL).kind).toBe("slot_full");
    expect(errorFromSw(SW_PIN_REQUIRED).kind).toBe("pin_required");
    expect(errorFromSw(SW_PIN_BLOCKED).kind).toBe("pin_blocked");
    expect(errorFromSw(0x63c2).kind).toBe("pin_wrong");
    expect(isPinTriesSw(0x63c2)).toBe(true);
    expect(pinTriesLeft(0x63c2)).toBe(2);
    expect(errorFromSw(0x6a82).kind).toBe("sw");
    expect(errorFromSw(0x6a82).sw).toBe(0x6a82);
  });
});
