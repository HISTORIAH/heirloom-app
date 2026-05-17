import { expect, test } from "bun:test";
import { generateKeyPairSigner } from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  createTestContext,
  createAndMintTokens,
  createHeir,
  sendInitialize,
  sendUpdateHeir,
  sendRegisterAsset,
  deriveEstateVault,
  deriveTokenAccounts,
} from "./setup";
import { fetchEstate } from "@historiah/heirloom";

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

  // SOL-only estate: claimable_assets = 1. Single call (no token accounts)
  // sets up new PDAs and immediately closes old ones, moving SOL to new_vault.
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

  // claimable_assets after init: 1 (SOL) + 1 (token via initialize) = 2
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

  // Migrate token (claimable_assets: 2 → 1), then final SOL call closes old PDAs.
  await sendUpdateHeir(client, {
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    newHeir: newHeir.address,
    oldHeir: oldHeir.address,
    vaultTokenAccount: oldVaultTokenAccount,
  });

  await sendUpdateHeir(client, {
    newHeir: newHeir.address,
    oldHeir: oldHeir.address,
  });
});

test("it migrates multi-asset vault (sol + 2 tokens) to a new heir", async () => {
  const { client, authority } = await createTestContext();
  const oldHeir = await createHeir(client);
  const newHeir = await generateKeyPairSigner();

  const [{ mint: mint1 }, { mint: mint2 }] = await Promise.all([
    createAndMintTokens(),
    createAndMintTokens(),
  ]);

  const { vault: oldVault, estate: oldEstate } = await deriveEstateVault(
    authority.address,
    oldHeir.address,
  );

  const [
    { vaultTokenAccount: oldVaultTokenAccount1, authorityTokenAccount: authorityTokenAccount1 },
    { vaultTokenAccount: oldVaultTokenAccount2, authorityTokenAccount: authorityTokenAccount2 },
  ] = await Promise.all([
    deriveTokenAccounts(oldVault, authority.address, oldHeir.address, mint1.address),
    deriveTokenAccounts(oldVault, authority.address, oldHeir.address, mint2.address),
  ]);

  // Initialize with SOL only — claimable_assets = 1 (SOL entry).
  await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "multi-asset",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    heir: oldHeir,
  });

  // Register two tokens — claimable_assets: 1 → 2 → 3.
  await sendRegisterAsset(client, {
    heir: oldHeir.address,
    amount: 500_000n,
    mint: mint1.address,
    vaultTokenAccount: oldVaultTokenAccount1,
    authorityTokenAccount: authorityTokenAccount1,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  await sendRegisterAsset(client, {
    heir: oldHeir.address,
    amount: 500_000n,
    mint: mint2.address,
    vaultTokenAccount: oldVaultTokenAccount2,
    authorityTokenAccount: authorityTokenAccount2,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  // Migrate mint1 (claimable_assets: 3 → 2).
  let { newEstate, newVault } = await sendUpdateHeir(client, {
    mint: mint1.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    newHeir: newHeir.address,
    oldHeir: oldHeir.address,
    vaultTokenAccount: oldVaultTokenAccount1,
  });

  // Migrate mint2 (claimable_assets: 2 → 1).
  await sendUpdateHeir(client, {
    mint: mint2.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    newHeir: newHeir.address,
    oldHeir: oldHeir.address,
    vaultTokenAccount: oldVaultTokenAccount2,
  });

  // Final SOL call: closes old PDAs, SOL moves to new_vault (claimable_assets: 1 → close).
  await sendUpdateHeir(client, {
    newHeir: newHeir.address,
    oldHeir: oldHeir.address,
  });

  const [
    oldEstateInfo,
    oldVaultInfo,
    newEstateData,
    newVaultBalance,
  ] = await Promise.all([
    client.rpc.getAccountInfo(oldEstate).send(),
    client.rpc.getAccountInfo(oldVault).send(),
    fetchEstate(client.rpc, newEstate),
    client.rpc.getBalance(newVault).send(),
  ]);

  // Old PDAs must be closed.
  expect(oldEstateInfo.value).toBeNull();
  expect(oldVaultInfo.value).toBeNull();

  // New estate is active and points to new heir.
  expect(newEstateData.data.isDeferred).toBe(false);
  expect(newEstateData.data.heir).toBe(newHeir.address);

  // New vault holds the migrated SOL deposit (1 SOL) plus absorbed vault rent.
  expect(newVaultBalance.value).toBeGreaterThan(1_000_000_000n);
});
