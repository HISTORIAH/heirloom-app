import { expect, test } from "bun:test";
import { generateKeyPairSigner, lamports } from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  getInitializeInstructionAsync,
  getRegisterAssetInstructionAsync,
} from "@historiah/heirloom";
import {
  createTestContext,
  createHeir,
  createAndMintTokens,
  sendInitialize,
  sendRegisterAsset,
  deriveEstateVault,
  deriveTokenAccounts,
  getEstate,
  getLamportBalance,
  getTokenBalance,
  sendInstructions,
  sendInstruction,
} from "./setup";

test("it bundles init and register token in one transaction", async () => {
  const { client, authority } = await createTestContext();
  const heir = await createHeir(client);
  const { mint } = await createAndMintTokens();

  const { vault, estate } = await deriveEstateVault(authority.address, heir.address);
  const { vaultTokenAccount, authorityTokenAccount } = await deriveTokenAccounts(
    vault,
    authority.address,
    heir.address,
    mint.address,
  );

  const initIx = await getInitializeInstructionAsync({
    authority,
    heir: heir.address,
    heartbeatInterval: 0n,
    vault,
    estate,
    mint: mint.address,
    vaultTokenAccount,
    authorityTokenAccount,
    gracePeriod: 0n,
    pauseDuration: 0n,
    label: "test-register",
    amount: 100_000n,
  });

  const { mint: newMint } = await createAndMintTokens();
  const {
    vaultTokenAccount: newVaultTokenAccount,
    authorityTokenAccount: newAuthorityTokenAccount,
  } = await deriveTokenAccounts(vault, authority.address, heir.address, newMint.address);

  const registerIx = await getRegisterAssetInstructionAsync({
    authority,
    heir: heir.address,
    mint: newMint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    amount: 1_000_000,
    vaultTokenAccount: newVaultTokenAccount,
    vault,
    estate,
    authorityTokenAccount: newAuthorityTokenAccount,
  });

  await sendInstructions(client, authority, [initIx, registerIx]);

  expect(await getTokenBalance(client, vaultTokenAccount)).toBe(100_000n);
  expect(await getTokenBalance(client, newVaultTokenAccount)).toBe(1_000_000n);
  expect(await getTokenBalance(client, authorityTokenAccount)).toBe(999_900_000n);
  expect(await getTokenBalance(client, newAuthorityTokenAccount)).toBe(999_000_000n);
  expect((await getEstate(client, estate)).data.claimableAssets).toBe(3);
});

test("it inits with a token then registers a SOL asset separately", async () => {
  const { client, authority } = await createTestContext();
  const heir = await createHeir(client);
  const { mint } = await createAndMintTokens();

  const { vaultTokenAccount, authorityTokenAccount } = await deriveTokenAccounts(
    (await deriveEstateVault(authority.address, heir.address)).vault,
    authority.address,
    heir.address,
    mint.address,
  );

  await sendInitialize(client, {
    heir,
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    label: "test-init-with-token",
    amount: 100_000n,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount,
    authorityTokenAccount,
  });

  const { estate, vault } = await deriveEstateVault(authority.address, heir.address);
  const vaultBalanceBefore = await getLamportBalance(client, vault);
  await sendRegisterAsset(client, {
    heir: heir.address,
    amount: 5_000_000_000n,
  });

  expect((await getLamportBalance(client, vault)) - vaultBalanceBefore).toBe(5_000_000_000n);
  expect((await getEstate(client, estate)).data.claimableAssets).toBe(3);
});

test("it registers 4 mints in a single transaction", async () => {
  const { client, authority } = await createTestContext();
  const heir = await createHeir(client);

  const { vault, estate } = await deriveEstateVault(authority.address, heir.address);

  // Create 4 mints
  const mints = await Promise.all([
    createAndMintTokens(),
    createAndMintTokens(),
    createAndMintTokens(),
    createAndMintTokens(),
  ]);

  // Derive token accounts for all 4 mints
  const tokenAccounts = await Promise.all(
    mints.map(({ mint }) =>
      deriveTokenAccounts(vault, authority.address, heir.address, mint.address),
    ),
  );

  // Initialize estate with first mint
  const initIx = await getInitializeInstructionAsync({
    authority,
    heir: heir.address,
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    label: "test-4-mints",
    amount: 100_000n,
    vault,
    estate,
    mint: mints[0].mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount: tokenAccounts[0]?.vaultTokenAccount,
    authorityTokenAccount: tokenAccounts[0]?.authorityTokenAccount,
  });

  // Register the remaining 3 mints
  const registerIxs = await Promise.all(
    mints.slice(1).map(({ mint }, i) =>
      getRegisterAssetInstructionAsync({
        authority,
        heir: heir.address,
        mint: mint.address,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
        amount: 1_000_000n,
        vaultTokenAccount: tokenAccounts[i + 1]?.vaultTokenAccount,
        vault,
        estate,
        authorityTokenAccount: tokenAccounts[i + 1]?.authorityTokenAccount,
      }),
    ),
  );

  await sendInstructions(client, authority, [initIx, ...registerIxs]);

  for (const [index, accounts] of tokenAccounts.entries()) {
    const expectedVaultBalance = index === 0 ? 100_000n : 1_000_000n;
    expect(await getTokenBalance(client, accounts.vaultTokenAccount)).toBe(expectedVaultBalance);
  }
  expect((await getEstate(client, estate)).data.claimableAssets).toBe(5);
});

test("it rejects a zero-value SOL registration", async () => {
  const { client } = await createTestContext();
  const { authority, heir } = await sendInitialize(client, {
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    label: "test-zero-register",
    amount: 1_000_000_000n,
  });
  const { estate, vault } = await deriveEstateVault(authority, heir.address);
  const vaultBalanceBefore = await getLamportBalance(client, vault);

  await expect(sendRegisterAsset(client, { heir: heir.address, amount: 0n })).rejects.toThrow();

  expect(await getLamportBalance(client, vault)).toBe(vaultBalanceBefore);
  expect((await getEstate(client, estate)).data.claimableAssets).toBe(1);
});

test("it rejects asset registration from a wallet other than the authority", async () => {
  const { client } = await createTestContext();
  const { authority, heir } = await sendInitialize(client, {
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    label: "test-register-unauthorized",
    amount: 1_000_000_000n,
  });
  const unauthorizedAuthority = await generateKeyPairSigner();
  await client.rpc.requestAirdrop(unauthorizedAuthority.address, lamports(10_000_000n)).send();

  const { estate, vault } = await deriveEstateVault(authority, heir.address);
  const vaultBalanceBefore = await getLamportBalance(client, vault);
  const ix = await getRegisterAssetInstructionAsync({
    authority: unauthorizedAuthority,
    heir: heir.address,
    estate,
    vault,
    amount: 1_000_000n,
  });

  await expect(sendInstruction(client, unauthorizedAuthority, ix)).rejects.toThrow();

  expect(await getLamportBalance(client, vault)).toBe(vaultBalanceBefore);
  expect((await getEstate(client, estate)).data.authority).toBe(authority);
});
