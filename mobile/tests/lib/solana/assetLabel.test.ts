import { describe, expect, test } from "bun:test";

import { assetLabel } from "@/lib/solana/assetLabel";

const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("assetLabel", () => {
  test("uses the DAS name and symbol", () => {
    const asset = {
      id: MINT,
      token_info: { symbol: "USDC" },
      content: { metadata: { name: "USD Coin" } },
    };
    expect(assetLabel(MINT, asset)).toEqual({
      symbol: "USDC",
      name: "USD Coin",
      named: true,
      image: undefined,
    });
  });

  test("falls back to the symbol for the name", () => {
    const asset = { id: MINT, content: { metadata: { name: " ", symbol: "BONK" } } };
    expect(assetLabel(MINT, asset)).toMatchObject({ symbol: "BONK", name: "BONK", named: true });
  });

  test("a mint DAS knows nothing about is an unnamed Unknown token", () => {
    expect(assetLabel(MINT, undefined)).toEqual({
      symbol: "EPjF",
      name: "Unknown token",
      named: false,
      image: undefined,
    });
  });
});
