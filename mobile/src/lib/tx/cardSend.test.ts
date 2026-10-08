import type { Instruction } from "@solana/kit";
import { describe, expect, test } from "bun:test";

import { packInstructionsForCard } from "./cardSend";

const ix = { programAddress: "11111111111111111111111111111111" } as Instruction;

describe("packInstructionsForCard", () => {
  test("keeps a short list in one batch", () => {
    const batches = packInstructionsForCard(() => 100, [ix, ix]);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
  });

  test("splits when adding the next ix would exceed the cap", () => {
    const batches = packInstructionsForCard((group) => group.length * 600, [ix, ix, ix]);
    expect(batches.map((b) => b.length)).toEqual([1, 1, 1]);
  });

  test("throws when a single ix is already too large", () => {
    expect(() => packInstructionsForCard(() => 2000, [ix])).toThrow("too large");
  });

  test("returns no batches for an empty list", () => {
    expect(packInstructionsForCard(() => 0, [])).toEqual([]);
  });
});
