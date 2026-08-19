import { expect, test } from "bun:test";
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022";
import {
  accountExists,
  createAndMintTokens,
  createTestClient,
  generateKeyPairSignerWithSol,
  genInitSolEstateIx,
  genRegisterAssetIx,
  genUpdateHeirIx,
} from "./setup";
import { fetchEstate } from "../src/generated";

// NOTE: SOL-only and single-token heir migration are covered by updateHeirAndClaim.test.ts

test("it migrates multi-asset vault (sol + 2 tokens) to a new heir", async () => {
  const client = await createTestClient();
  const [authority, oldHeir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const newHeir = await generateKeyPairSignerWithSol(client);

  const [{ mint: mint1 }, { mint: mint2 }] = await Promise.all([
    createAndMintTokens(client, authority),
    createAndMintTokens(client, authority),
  ]);

  // Initialize with SOL only — claimable_assets = 1 (SOL entry).
  const { ix: initIx, estate: oldEstate, vault: oldVault } = await genInitSolEstateIx({
    client,
    authority,
    heir: oldHeir,
    amount: 1_000_000_000n,
  });
  await client.sendTransaction(initIx);

  // Register two tokens — claimable_assets: 1 → 2 → 3.
  const { ix: registerIx1 } = await genRegisterAssetIx({
    client,
    authority,
    heir: oldHeir.address,
    mint: mint1,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    amount: 500_000n,
  });
  await client.sendTransaction(registerIx1);
  const { ix: registerIx2 } = await genRegisterAssetIx({
    client,
    authority,
    heir: oldHeir.address,
    mint: mint2,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    amount: 500_000n,
  });
  await client.sendTransaction(registerIx2);

  // Migrate mint1 (claimable_assets: 3 → 2).
  const { ix: updateHeirIx1, newEstate, newVault } = await genUpdateHeirIx({
    client,
    authority,
    oldHeir: oldHeir.address,
    newHeir: newHeir.address,
    mint: mint1,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });
  await client.sendTransaction(updateHeirIx1);

  // Migrate mint2 (claimable_assets: 2 → 1).
  const { ix: updateHeirIx2 } = await genUpdateHeirIx({
    client,
    authority,
    oldHeir: oldHeir.address,
    newHeir: newHeir.address,
    mint: mint2,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });
  await client.sendTransaction(updateHeirIx2);

  // Final SOL call: closes old PDAs, SOL moves to new_vault (claimable_assets: 1 → close).
  const { ix: updateHeirIx3 } = await genUpdateHeirIx({
    client,
    authority,
    oldHeir: oldHeir.address,
    newHeir: newHeir.address,
  });
  await client.sendTransaction(updateHeirIx3);

  const [oldEstateExists, oldVaultExists, newEstateData, newVaultBalance] = await Promise.all([
    accountExists(client, oldEstate),
    accountExists(client, oldVault),
    fetchEstate(client.rpc, newEstate),
    client.rpc.getBalance(newVault).send(),
  ]);

  // Old PDAs must be closed.
  expect(oldEstateExists).toBe(false);
  expect(oldVaultExists).toBe(false);

  // New estate is active and points to new heir.
  expect(newEstateData.data.isMigrating).toBe(false);
  expect(newEstateData.data.heir).toBe(newHeir.address);

  // New vault holds the migrated SOL deposit (1 SOL) plus absorbed vault rent.
  expect(newVaultBalance.value).toBeGreaterThan(1_000_000_000n);
});
