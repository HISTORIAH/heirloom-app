import { describe, expect, test } from "bun:test";

import { address, type TransactionSigner } from "@solana/kit";

import { buildTokenTransferIxs } from "@/lib/tx/cardSweep";
import type { SweepToken } from "@/types/claim";

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

