import { describe, expect, test } from "bun:test";

import { digitsToPinBytes, parsePinStatus, PIN_MAX_LEN, PIN_MIN_LEN } from "./pin";

describe("digitsToPinBytes", () => {
  test("encodes ASCII digits", () => {
    expect(Array.from(digitsToPinBytes("1234"))).toEqual([0x31, 0x32, 0x33, 0x34]);
  });

  test("rejects short, long, and non-digit", () => {
    expect(() => digitsToPinBytes("123")).toThrow(`${PIN_MIN_LEN}`);
    expect(() => digitsToPinBytes("1".repeat(PIN_MAX_LEN + 1))).toThrow(`${PIN_MAX_LEN}`);
    expect(() => digitsToPinBytes("12ab")).toThrow("digits");
  });
});

describe("parsePinStatus", () => {
  test("no PIN, set, and blocked", () => {
    expect(parsePinStatus(Uint8Array.of(1, 0, 0))).toEqual({ kind: "none" });
    expect(parsePinStatus(Uint8Array.of(1, 1, 3))).toEqual({ kind: "set", triesLeft: 3 });
    expect(parsePinStatus(Uint8Array.of(1, 1, 0))).toEqual({ kind: "blocked" });
    expect(parsePinStatus(new Uint8Array())).toEqual({ kind: "none" });
  });
});
