import { expect, test } from "bun:test";
import {
  createDefaultSolanaClient,
  sendInitialize,
  sendUpdateHeir,
  createAndMintTokens,
  loadDefaultKeypair,
} from "./setup";
import { generateKeyPairSigner } from "@solana/kit";
import { getAssociatedTokenAddressSync } from "@solana-program/token";

test("it migrates sol vault to a new heir", async () => {
  const client = createDefaultSolanaClient();

  const { heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "test-heir",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });

  const { newHeir } = await sendUpdateHeir(client, {
    heir: heir.address,
  });

  expect(newHeir.address).toBeTruthy();
});

test("it migrates token vault to a new heir", async () => {
  const client = createDefaultSolanaClient();
  const authority = await loadDefaultKeypair();

  const { mint } = await createAndMintTokens();

  // derive the authority's ATA as source, and vault ATAs
  const authorityAta = getAssociatedTokenAddressSync(
    mint.address,
    authority.address,
  );
  const newHeir = await generateKeyPairSigner();
  const vaultAta = getAssociatedTokenAddressSync(mint.address, /* vault pda — resolved by generated client */);

  const { heir } = await sendInitialize(client, {
    amount: 1_000_000n,
    label: "test-heir-token",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount: authorityAta, // placeholder — replace with vault ATA
  });

  // TODO: pass proper vaultTokenAccount / newVaultTokenAccount ATAs
  await sendUpdateHeir(client, {
    heir: heir.address,
    mint: mint.address,
  });
});
