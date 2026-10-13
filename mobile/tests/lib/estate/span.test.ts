import { describe, expect, test } from "bun:test";

import { cardNeedsClaimGas } from "@/lib/estate/span";

describe("cardNeedsClaimGas", () => {
  test("empty means the card is not waiting on a claim", () => {
    expect(cardNeedsClaimGas([])).toBe(false);
  });

  test("any live or open estate holds the prepaid fees", () => {
    expect(cardNeedsClaimGas(["active"])).toBe(true);
    expect(cardNeedsClaimGas(["grace"])).toBe(true);
    expect(cardNeedsClaimGas(["claimable"])).toBe(true);
    expect(cardNeedsClaimGas(["distributed", "active"])).toBe(true);
  });

  test("only claimed estates release Send", () => {
    expect(cardNeedsClaimGas(["distributed"])).toBe(false);
    expect(cardNeedsClaimGas(["distributed", "distributed"])).toBe(false);
  });
});
