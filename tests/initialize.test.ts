import { expect, test } from "bun:test";
import {
  createDefaultSolanaClient,
  sendInitialize,
} from "./setup";

test("2 + 2", () => {
  expect(2 + 2).toBe(4);
});

test("it initialized native sol pools", async (t) => {
  const client = createDefaultSolanaClient();

  // create pool
  console.log("calling init pool");
  await sendInitialize(client, {
      amount: BigInt(1_000_000_000), // TODO: this is in lamports(one sol)
      label: "test",
      heartbeatInterval: 0n, // TODO
      gracePeriod: 0n, // TODO
      pauseDuration: 0n, // TODO
  });

  // TODO: Get vault to verify it received the funds
});
