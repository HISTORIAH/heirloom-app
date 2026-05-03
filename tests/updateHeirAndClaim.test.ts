import { expect, test } from "bun:test";
import { generateKeyPairSigner, lamports } from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  createTestContext,
  createAndMintTokens,
  createHeir,
  sendInitialize,
  sendUpdateHeir,
  sendClaim,
  deriveEstateVault,
  deriveTokenAccounts,
} from "./setup";

test("init → update heir → claim SOL with new heir", async () => {
  const { client } = await createTestContext();

  const { heir: oldHeir } = await sendInitialize(client, {
    amount: BigInt(100_000),
    label: "test-heir-migration-sol",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });

  const newHeir = await generateKeyPairSigner();
  await client.rpc
    .requestAirdrop(newHeir.address, lamports(100000n))
    .send();

  await sendUpdateHeir(client, {
    newHeir: newHeir.address,
    oldHeir: oldHeir.address,
  });

  await sendClaim(client, { heir: newHeir });

  expect(newHeir.address).toBeTruthy();
});

test("init → update heir → claim token with new heir", async () => {
  const { client, authority } = await createTestContext();
  const oldHeir = await createHeir(client);
  const newHeir = await createHeir(client);

  const { mint } = await createAndMintTokens();

  const { vault: oldVault } = await deriveEstateVault(
    authority.address,
    oldHeir.address,
  );
  const { vaultTokenAccount: oldVaultTokenAccount, authorityTokenAccount } =
    await deriveTokenAccounts(oldVault, authority.address, oldHeir.address, mint.address);

  await sendInitialize(client, {
    amount: 1_000_000n,
    label: "test-heir-migration-token",
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
    newHeir: newHeir.address,
    oldHeir: oldHeir.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount: oldVaultTokenAccount,
  });

  const { vault: newVault, estate: newEstate } = await deriveEstateVault(
    authority.address,
    newHeir.address,
  );
  const { vaultTokenAccount: newVaultTokenAccount, heirTokenAccount, treasuryTokenAccount} =
    await deriveTokenAccounts(newVault, authority.address, newHeir.address, mint.address);

  await sendClaim(client, {
    heir: newHeir,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount: newVaultTokenAccount,
    heirTokenAccount,
    treasuryTokenAccount
  });

  expect(newHeir.address).toBeTruthy();
});
