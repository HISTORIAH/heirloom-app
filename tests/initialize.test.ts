import { expect, test } from "bun:test";
import {
  appendTransactionMessageInstruction,
  generateKeyPairSigner,
  lamports,
  pipe,
} from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  getInitializeInstructionAsync,
  getRegisterAssetInstructionAsync,
  findVaultPda,
} from "@historiah/heirloom";
import {
  createDefaultSolanaClient,
  createDefaultTransaction,
  createAndMintTokens,
  loadDefaultKeypair,
  sendInitialize,
  signAndSendTransaction,
} from "./setup";

test("2 + 2", () => {
  expect(2 + 2).toBe(4);
});

test("it initializes a native SOL vault", async () => {
  const client = createDefaultSolanaClient();
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
