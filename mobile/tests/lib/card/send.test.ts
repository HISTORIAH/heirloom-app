import {
  address,
  type Instruction,
  type SignatureBytes,
  type Transaction,
  type TransactionPartialSigner,
} from "@solana/kit";
import { describe, expect, test } from "bun:test";

import { packInstructionsForCard, sendCardBatches } from "@/lib/card/send";
import type { EstateRpc } from "@/types/program";

const ix = { programAddress: "11111111111111111111111111111111" } as Instruction;

describe("packInstructionsForCard", () => {
  test("keeps a short list in one batch", () => {
    const batches = packInstructionsForCard(() => 100, [ix, ix], 1024);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
  });

  test("splits when adding the next ix would exceed the cap", () => {
    const batches = packInstructionsForCard((group) => group.length * 600, [ix, ix, ix], 1024);
    expect(batches.map((b) => b.length)).toEqual([1, 1, 1]);
  });

  test("throws when a single ix is already too large", () => {
    expect(() => packInstructionsForCard(() => 2000, [ix], 1024)).toThrow("too large");
  });

  test("packs to the card's own limit", () => {
    const measure = (group: Instruction[]) => group.length * 400;
    expect(packInstructionsForCard(measure, [ix, ix, ix], 1024).map((b) => b.length)).toEqual([2, 1]);
    expect(packInstructionsForCard(measure, [ix, ix, ix], 930).map((b) => b.length)).toEqual([2, 1]);
    expect(packInstructionsForCard(measure, [ix, ix, ix], 700).map((b) => b.length)).toEqual([1, 1, 1]);
  });

  test("returns no batches for an empty list", () => {
    expect(packInstructionsForCard(() => 0, [], 1024)).toEqual([]);
  });
});

describe("sendCardBatches", () => {
  const CARD = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const bulky = {
    programAddress: address("11111111111111111111111111111111"),
    data: new Uint8Array(400),
  } as Instruction;

  function fakeRpc(sent: string[]): EstateRpc {
    return {
      getLatestBlockhash: () => ({
        send: async () => ({
          value: { blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 100n },
        }),
      }),
      sendTransaction: (wire: string) => ({
        send: async () => {
          sent.push(wire);
          return wire;
        },
      }),
      getSignatureStatuses: () => ({
        send: async () => ({ value: [{ err: null, confirmationStatus: "confirmed" }] }),
      }),
    } as unknown as EstateRpc;
  }

  test("signs every batch in one call to the card, then sends each", async () => {
    const calls: number[] = [];
    const signer: TransactionPartialSigner = {
      address: CARD,
      signTransactions: async (txs: readonly Transaction[]) => {
        calls.push(txs.length);
        return txs.map(() => ({ [CARD]: new Uint8Array(64).fill(7) as SignatureBytes }));
      },
    };
    const sent: string[] = [];
    const sigs = await sendCardBatches(fakeRpc(sent), signer, [bulky, bulky, bulky], 700);
    expect(calls).toEqual([3]);
    expect(sent).toHaveLength(3);
    expect(sigs).toHaveLength(3);
  });
});
