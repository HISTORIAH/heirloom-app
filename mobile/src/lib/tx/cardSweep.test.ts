import { describe, expect, test } from "bun:test";

import { spareLamports } from "./cardSweep";

describe("spareLamports", () => {
  test("leaves rent plus two network fees", () => {
    expect(spareLamports(2_000_000n, 890_880n)).toBe(1_099_120n);
  });

  test("is zero when the card only has rent", () => {
    expect(spareLamports(890_880n, 890_880n)).toBe(0n);
  });

  test("is zero when the card has rent plus two fees and nothing more", () => {
    expect(spareLamports(890_880n + 10_000n, 890_880n)).toBe(0n);
  });
});
