import { address, type TransactionPartialSigner } from "@solana/kit";
import { describe, expect, test } from "bun:test";

import { MSG_MAX } from "./apdu";
import { createCardTransactionSigner } from "./kitSigner";

const ADDR = address("11111111111111111111111111111111");

type CompiledTx = Parameters<TransactionPartialSigner["signTransactions"]>[0][number];

function txWith(message: Uint8Array): CompiledTx {
  return { messageBytes: message, signatures: {} } as unknown as CompiledTx;
}

describe("createCardTransactionSigner", () => {
  test("signs each message and keys the dict by the card address", async () => {
    const seen: number[] = [];
    const signer = createCardTransactionSigner(ADDR, async (message) => {
      seen.push(message.length);
      return Uint8Array.from({ length: 64 }, (_, i) => i);
    });
    const dicts = await signer.signTransactions([txWith(Uint8Array.of(1, 2, 3))]);
    expect(seen).toEqual([3]);
    expect(dicts[0]?.[ADDR]?.length).toBe(64);
  });

  test("rejects a message over MSG_MAX before SIGN", async () => {
    const signer = createCardTransactionSigner(ADDR, async () => {
      throw new Error("should not sign");
    });
    await expect(
      signer.signTransactions([txWith(Uint8Array.from({ length: MSG_MAX + 1 }))]),
    ).rejects.toThrow("too large");
  });

  test("rejects a signature that is not 64 bytes", async () => {
    const signer = createCardTransactionSigner(ADDR, async () => Uint8Array.of(1, 2, 3));
    await expect(signer.signTransactions([txWith(Uint8Array.of(1))])).rejects.toThrow("bad signature");
  });
});
