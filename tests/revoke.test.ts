import { expect, test } from "bun:test";
import { generateKeyPairSigner, lamports } from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { getRevokeInstructionAsync, TREASURY_ADDRESS } from "@historiah/heirloom";
import {
  accountExists,
  calculateFee,
  createTestContext,
  createAndMintTokens,
  createHeir,
  deriveEstateVault,
  deriveTokenAccounts,
  getEstate,
  getLamportBalance,
  getTokenBalance,
  sendInitialize,
  sendInstruction,
  sendRevoke,
  sendUpdateHeir,
} from "./setup";

test("it creates a token-only vault and revokes it", async () => {
  const { client, authority } = await createTestContext();
  const heir = await createHeir(client);
  const { mint } = await createAndMintTokens();

  const { vault, estate } = await deriveEstateVault(authority.address, heir.address);
  const { vaultTokenAccount, authorityTokenAccount, treasuryTokenAccount } =
    await deriveTokenAccounts(vault, authority.address, heir.address, mint.address);

  await sendInitialize(client, {
    heir,
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    label: "test-token-only-revoke",
    amount: 500_000n,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount,
    authorityTokenAccount,
  });

  expect(await getTokenBalance(client, vaultTokenAccount)).toBe(500_000n);
  const authorityBalanceBefore = await getTokenBalance(client, authorityTokenAccount);

  await sendRevoke(client, {
    heir: heir.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount,
    authorityTokenAccount,
    treasuryTokenAccount,
  });

  expect((await getTokenBalance(client, authorityTokenAccount)) - authorityBalanceBefore).toBe(
    497_500n,
  );
  expect(await getTokenBalance(client, treasuryTokenAccount)).toBe(2_500n);
  expect(await accountExists(client, vaultTokenAccount)).toBe(false);
  expect((await getEstate(client, estate)).data.claimableAssets).toBe(1);

  const [vaultBalanceBefore, treasuryBalanceBefore] = await Promise.all([
    getLamportBalance(client, vault),
    getLamportBalance(client, TREASURY_ADDRESS),
  ]);
  await sendRevoke(client, { heir: heir.address, estate, vault });

  expect((await getLamportBalance(client, TREASURY_ADDRESS)) - treasuryBalanceBefore).toBe(
    calculateFee(vaultBalanceBefore, 50n),
  );
  expect(await accountExists(client, estate)).toBe(false);
  expect(await accountExists(client, vault)).toBe(false);
});

test("it creates a token-only vault, updates heir and revokes it", async () => {
  const { client, authority } = await createTestContext();
  const heir = await createHeir(client);
  const newHeir = await generateKeyPairSigner();
  const { mint } = await createAndMintTokens();

  const { vault, estate } = await deriveEstateVault(authority.address, heir.address);
  const { vaultTokenAccount, authorityTokenAccount, treasuryTokenAccount } =
    await deriveTokenAccounts(vault, authority.address, heir.address, mint.address);

  const { estate: newEstate, vault: newVault } = await deriveEstateVault(
    authority.address,
    newHeir.address,
  );
  const { vaultTokenAccount: newVaultTokenAccount } = await deriveTokenAccounts(
    newVault,
    authority.address,
    newHeir.address,
    mint.address,
  );

  await sendInitialize(client, {
    heir,
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    label: "test-token-only-revoke",
    amount: 500_000n,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount,
    authorityTokenAccount,
  });

  await sendUpdateHeir(client, {
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    newHeir: newHeir.address,
    oldHeir: heir.address,
    vaultTokenAccount,
  });

  expect(await accountExists(client, vaultTokenAccount)).toBe(false);
  expect(await getTokenBalance(client, newVaultTokenAccount)).toBe(500_000n);
  expect((await getEstate(client, newEstate)).data.heir).toBe(newHeir.address);

  const authorityBalanceBefore = await getTokenBalance(client, authorityTokenAccount);
  await sendRevoke(client, {
    heir: newHeir.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount: newVaultTokenAccount,
    authorityTokenAccount,
    treasuryTokenAccount,
  });

  expect((await getTokenBalance(client, authorityTokenAccount)) - authorityBalanceBefore).toBe(
    497_500n,
  );
  expect(await getTokenBalance(client, treasuryTokenAccount)).toBe(2_500n);
  expect(await accountExists(client, newVaultTokenAccount)).toBe(false);
  expect((await getEstate(client, newEstate)).data.claimableAssets).toBe(1);

  await sendRevoke(client, {
    heir: newHeir.address,
    estate: newEstate,
    vault: newVault,
  });
  expect(await accountExists(client, newEstate)).toBe(false);
  expect(await accountExists(client, newVault)).toBe(false);
});

test("it rejects a revoke signed by a wallet other than the authority", async () => {
  const { client } = await createTestContext();
  const { authority, heir } = await sendInitialize(client, {
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    label: "test-revoke-unauthorized",
    amount: 1_000_000_000n,
  });
  const unauthorizedAuthority = await generateKeyPairSigner();
  await client.rpc.requestAirdrop(unauthorizedAuthority.address, lamports(10_000_000n)).send();

  const { estate, vault } = await deriveEstateVault(authority, heir.address);
  const vaultBalanceBefore = await getLamportBalance(client, vault);
  const ix = await getRevokeInstructionAsync({
    authority: unauthorizedAuthority,
    heir: heir.address,
    estate,
    vault,
    treasury: TREASURY_ADDRESS,
  });

  await expect(sendInstruction(client, unauthorizedAuthority, ix)).rejects.toThrow();

  expect(await getLamportBalance(client, vault)).toBe(vaultBalanceBefore);
  expect((await getEstate(client, estate)).data.authority).toBe(authority);
});
