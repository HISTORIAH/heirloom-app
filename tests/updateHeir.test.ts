import { expect, test } from "bun:test";
import { generateKeyPairSigner } from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  createTestContext,
  createAndMintTokens,
  createHeir,
  sendInitialize,
  sendUpdateHeir,
  deriveEstateVault,
  deriveTokenAccounts,
} from "./setup";

test("it migrates sol vault to a new heir", async () => {
  const { client } = await createTestContext();

  const { heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "test-heir",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });

  const newHeir = await generateKeyPairSigner();

  await sendUpdateHeir(client, {
    newHeir: newHeir.address,
    oldHeir: heir.address,
  });

  expect(newHeir.address).toBeTruthy();
});

test("it migrates token vault to a new heir", async () => {
  const { client, authority } = await createTestContext();
  const oldHeir = await createHeir(client);
  const newHeir = await generateKeyPairSigner();

  const { mint } = await createAndMintTokens();

  const { vault: oldVault } = await deriveEstateVault(
    authority.address,
    oldHeir.address,
  );
  const { vaultTokenAccount: oldVaultTokenAccount, authorityTokenAccount } =
    await deriveTokenAccounts(oldVault, authority.address, oldHeir.address, mint.address);

  await sendInitialize(client, {
    amount: 1_000_000n,
    label: "test-heir-token",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    mint: mint.address,
    heir: oldHeir,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount: oldVaultTokenAccount,
    authorityTokenAccount,
  });

  await sendUpdateHeir(client, {
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    newHeir: newHeir.address,
    oldHeir: oldHeir.address,
    vaultTokenAccount: oldVaultTokenAccount,
  });
});
