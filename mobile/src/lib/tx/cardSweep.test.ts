import { describe, expect, test } from "bun:test";

import { address, type TransactionSigner } from "@solana/kit";

import { buildTokenTransferIxs, spareLamports } from "./cardSweep";
import type { SweepToken } from "@/types/claim";

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

describe("buildTokenTransferIxs", () => {
  const signer: TransactionSigner = {
    address: address("11111111111111111111111111111111"),
    signTransactions: async () => [],
  };
  const tok: SweepToken = {
    mint: address("So11111111111111111111111111111111111111112"),
    source: address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    tokenProgram: address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    amount: 10n,
    decimals: 6,
  };
  const dest = address("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

  test("rejects more than the card holds", async () => {
    await expect(buildTokenTransferIxs(signer, dest, tok, 11n)).rejects.toThrow("more than");
  });

  test("returns nothing for a zero amount", async () => {
    expect(await buildTokenTransferIxs(signer, dest, tok, 0n)).toEqual([]);
  });
});

