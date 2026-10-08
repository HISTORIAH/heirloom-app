import { address, type TransactionSigner } from "@solana/kit";
import { describe, expect, test } from "bun:test";

import { runCardClaimAndSweep } from "./cardClaim";
import type { EstateRow, EstateRpc } from "@/types/program";

const HEIR = address("11111111111111111111111111111111");
const OTHER = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

function signerAt(addr: ReturnType<typeof address>): TransactionSigner {
  return { address: addr, signTransactions: async () => [] };
}

function rowFor(heir: ReturnType<typeof address>): EstateRow {
  return {
    address: heir,
    data: { heir } as EstateRow["data"],
    claimableLamports: 0n,
  };
}

const rpc = {} as EstateRpc;

describe("runCardClaimAndSweep", () => {
  test("rejects a destination that is the credential itself", async () => {
    await expect(
      runCardClaimAndSweep({
        rpc,
        signer: signerAt(HEIR),
        row: rowFor(HEIR),
        destination: HEIR,
        skipClaim: true,
      }),
    ).rejects.toThrow("isn’t this credential");
  });

  test("rejects a card that is not the estate heir", async () => {
    await expect(
      runCardClaimAndSweep({
        rpc,
        signer: signerAt(OTHER),
        row: rowFor(HEIR),
        destination: OTHER,
        skipClaim: true,
      }),
    ).rejects.toThrow("not the heir");
  });
});
