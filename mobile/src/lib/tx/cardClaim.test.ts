import { address, type TransactionSigner } from "@solana/kit";
import { describe, expect, test } from "bun:test";

import { resolveCardClaimPlan, runCardClaim } from "./cardClaim";
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

describe("runCardClaim", () => {
  test("rejects a sweep destination that is the credential itself", async () => {
    await expect(
      runCardClaim({
        rpc,
        signer: signerAt(HEIR),
        row: rowFor(HEIR),
        plan: { kind: "sweep", destination: HEIR },
        skipClaim: true,
      }),
    ).rejects.toThrow("isn’t this credential");
  });

  test("rejects a card that is not the estate heir", async () => {
    await expect(
      runCardClaim({
        rpc,
        signer: signerAt(OTHER),
        row: rowFor(HEIR),
        plan: { kind: "keep" },
        skipClaim: true,
      }),
    ).rejects.toThrow("not the heir");
  });

  test("keep with skipClaim returns without sweeping", async () => {
    await expect(
      runCardClaim({
        rpc,
        signer: signerAt(HEIR),
        row: rowFor(HEIR),
        plan: { kind: "keep" },
        skipClaim: true,
      }),
    ).resolves.toEqual({ claimed: false });
  });
});

describe("resolveCardClaimPlan", () => {
  const sweep = { kind: "sweep" as const, destination: OTHER };
  const pinSet = { kind: "set" as const, triesLeft: 3 };
  const none = { kind: "none" as const };

  test("primary CTA on a PIN card keeps funds on the chip", () => {
    expect(
      resolveCardClaimPlan({ pin: pinSet, plan: sweep, skipClaim: false, cashOut: false }),
    ).toEqual({ kind: "keep" });
  });

  test("leftover on a PIN card is the wallet, not a sweep", () => {
    expect(
      resolveCardClaimPlan({ pin: pinSet, plan: sweep, skipClaim: true, cashOut: false }),
    ).toEqual({ kind: "home" });
  });

  test("paper cash-out on a PIN card still sweeps", () => {
    expect(
      resolveCardClaimPlan({ pin: pinSet, plan: sweep, skipClaim: false, cashOut: true }),
    ).toEqual(sweep);
  });

  test("bearer leftover still sweeps", () => {
    expect(
      resolveCardClaimPlan({ pin: none, plan: sweep, skipClaim: true, cashOut: false }),
    ).toEqual(sweep);
  });
});
