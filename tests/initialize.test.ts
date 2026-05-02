import { expect, test } from "bun:test";
import { generateKeyPairSigner } from "@solana/kit";
import { createTestContext, createHeir, sendInitialize } from "./setup";

test("2 + 2", () => {
  expect(2 + 2).toBe(4);
});

test("it initializes a native SOL vault", async () => {
  const { client } = await createTestContext();
  const heir = await generateKeyPairSigner();

  await sendInitialize(client, {
    heir,
    amount: BigInt(1_000_000_000),
    label: "test-sol",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });
});
