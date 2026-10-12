import { describe, expect, test } from "bun:test";

import { SOL_ASSET_ID } from "@/constants/create";
import { formatCreateAssetsLine, parseCreateDeposits } from "@/lib/tx/createDeposits";

const USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

const usdcWallet = { mint: USDC, decimals: 6, raw: 12_000_000n };

describe("parseCreateDeposits", () => {
  test("SOL only", () => {
    const got = parseCreateDeposits({ [SOL_ASSET_ID]: "1.5" }, []);
    expect(got.amountLamports).toBe(1_500_000_000n);
    expect(got.tokens).toEqual([]);
  });

  test("SOL plus a wallet token", () => {
    const got = parseCreateDeposits({ [SOL_ASSET_ID]: "1", [USDC]: "12" }, [usdcWallet]);
    expect(got.amountLamports).toBe(1_000_000_000n);
    expect(got.tokens).toEqual([{ mint: USDC, amount: 12_000_000n }]);
  });

  test("token only", () => {
    const got = parseCreateDeposits({ [SOL_ASSET_ID]: "", [USDC]: "0.5" }, [usdcWallet]);
    expect(got.amountLamports).toBe(0n);
    expect(got.tokens).toEqual([{ mint: USDC, amount: 500_000n }]);
  });

  test("skips blank rows", () => {
    const got = parseCreateDeposits({ [SOL_ASSET_ID]: "", [USDC]: "   " }, [usdcWallet]);
    expect(got).toEqual({ amountLamports: 0n, tokens: [] });
  });

  test("rejects a mint the wallet no longer holds", () => {
    expect(() => parseCreateDeposits({ [USDC]: "1" }, [])).toThrow(
      "That token is no longer in this wallet.",
    );
  });

  test("rejects more than the wallet holds", () => {
    expect(() => parseCreateDeposits({ [USDC]: "13" }, [usdcWallet])).toThrow(
      "This wallet does not have that much of this token.",
    );
  });
});

describe("formatCreateAssetsLine", () => {
  const assets = [
    { id: SOL_ASSET_ID, symbol: "SOL" },
    { id: USDC, symbol: "USDC" },
  ];

  test("lists each typed amount in picker order", () => {
    expect(formatCreateAssetsLine({ [SOL_ASSET_ID]: "1", [USDC]: "12" }, assets)).toBe(
      "1 SOL · 12 USDC",
    );
  });

  test("empty picker", () => {
    expect(formatCreateAssetsLine({ [SOL_ASSET_ID]: "" }, assets)).toBe("nothing yet");
  });
});
