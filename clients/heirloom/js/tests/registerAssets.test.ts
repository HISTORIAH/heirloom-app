import { expect, test } from "bun:test";
import {
  fetchToken,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import {
  createAndMintTokens,
  createTestClient,
  generateKeyPairSignerWithSol,
  genInitSolEstateIx,
  genInitTokenEstateIx,
  genRegisterAssetIx,
} from "./setup";
import { fetchEstate } from "../src/generated";

test("it inits with a token then registers a SOL asset separately", async () => {
  const client = await createTestClient();
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const { mint } = await createAndMintTokens(client, authority);

  const { ix: initIx, estate, vault } = await genInitTokenEstateIx({
    client,
    authority,
    heir: heir.address,
    mint,
    amount: 100_000n,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });
  await client.sendTransaction(initIx);

  const vaultBalanceBefore = (await client.rpc.getBalance(vault).send()).value;
  const { ix: registerIx } = await genRegisterAssetIx({
    client,
    authority,
    heir: heir.address,
    amount: 5_000_000_000n,
  });
  await client.sendTransaction(registerIx);

  const vaultBalanceAfter = (await client.rpc.getBalance(vault).send()).value;
  const estateAccData = await fetchEstate(client.rpc, estate);

  expect(vaultBalanceAfter - vaultBalanceBefore).toBe(5_000_000_000n);
  expect(estateAccData.data.claimableAssets).toBe(2);
});

test("it registers 4 mints in a single transaction", async () => {
  const client = await createTestClient();
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const mints = await Promise.all([
    createAndMintTokens(client, authority),
    createAndMintTokens(client, authority),
    createAndMintTokens(client, authority),
    createAndMintTokens(client, authority),
  ]);

  const { ix: initIx, estate, vault } = await genInitTokenEstateIx({
    client,
    authority,
    heir: heir.address,
    mint: mints[0]!.mint,
    amount: 100_000n,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });

  const registerIxs = await Promise.all(
    mints.slice(1).map(async ({ mint }) => {
      const { ix } = await genRegisterAssetIx({
        client,
        authority,
        heir: heir.address,
        mint,
        tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
        amount: 1_000_000n,
      });
      return ix;
    }),
  );

  await client.sendTransaction([initIx, ...registerIxs]);

  const vaultTokenAccounts = await Promise.all(
    mints.map(({ mint }) => findAssociatedTokenPda({ owner: vault, mint, tokenProgram: TOKEN_2022_PROGRAM_ADDRESS })),
  );
  for (const [index, [vaultTokenAccount]] of vaultTokenAccounts.entries()) {
    const expectedVaultBalance = index === 0 ? 100_000n : 1_000_000n;
    const tokenAccData = await fetchToken(client.rpc, vaultTokenAccount);
    expect(tokenAccData.data.amount).toBe(expectedVaultBalance);
  }
  expect((await fetchEstate(client.rpc, estate)).data.claimableAssets).toBe(5);
});

test("it rejects a zero-value SOL registration", async () => {
  const client = await createTestClient();
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  const { ix: initIx, estate, vault } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
  });
  await client.sendTransaction(initIx);

  const vaultBalanceBefore = (await client.rpc.getBalance(vault).send()).value;
  const { ix: registerIx } = await genRegisterAssetIx({
    client,
    authority,
    heir: heir.address,
    amount: 0n,
  });

  await expect(client.sendTransaction(registerIx)).rejects.toThrow();

  expect((await client.rpc.getBalance(vault).send()).value).toBe(vaultBalanceBefore);
  expect((await fetchEstate(client.rpc, estate)).data.claimableAssets).toBe(1);
});

test("it rejects asset registration from a wallet other than the authority", async () => {
  const client = await createTestClient();
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const unauthorizedAuthority = await generateKeyPairSignerWithSol(client);

  const { ix: initIx, estate, vault } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
  });
  await client.sendTransaction(initIx);

  const vaultBalanceBefore = (await client.rpc.getBalance(vault).send()).value;

  // Deliberately pass the real estate/vault addresses with a signer that
  // doesn't own them, to trigger the seeds/authority mismatch on-chain.
  const ix = await client.heirloom.instructions.registerAsset({
    authority: unauthorizedAuthority,
    heir: heir.address,
    estate,
    vault,
    amount: 1_000_000n,
  });

  await expect(client.sendTransaction(ix)).rejects.toThrow();

  expect((await client.rpc.getBalance(vault).send()).value).toBe(vaultBalanceBefore);
  expect((await fetchEstate(client.rpc, estate)).data.authority).toBe(authority.address);
});

test("it lets the authority register a mint whose vault ATA was created by someone else first", async () => {
  const client = await createTestClient();
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const { mint } = await createAndMintTokens(client, authority);

  const { ix: initIx, estate, vault } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
  });
  await client.sendTransaction(initIx);

  const [vaultTokenAccount] = await findAssociatedTokenPda({
    owner: vault,
    mint,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });

  // Someone other than the authority pre-creates the vault's ATA before
  // register_asset is ever called for this mint. ATA creation is
  // permissionless, so this must not be able to block legitimate registration.
  const attacker = await generateKeyPairSignerWithSol(client);
  const createAtaIx = await getCreateAssociatedTokenIdempotentInstructionAsync({
    payer: attacker,
    owner: vault,
    mint,
  });
  await client.sendTransaction(createAtaIx);
  expect((await fetchToken(client.rpc, vaultTokenAccount)).data.amount).toBe(0n);

  const { ix: registerIx } = await genRegisterAssetIx({
    client,
    authority,
    heir: heir.address,
    mint,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    amount: 250_000n,
  });
  await client.sendTransaction(registerIx);

  expect((await fetchToken(client.rpc, vaultTokenAccount)).data.amount).toBe(250_000n);
  expect((await fetchEstate(client.rpc, estate)).data.claimableAssets).toBe(2);
});

test("it rejects registering the same mint twice", async () => {
  const client = await createTestClient();
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const { mint } = await createAndMintTokens(client, authority);

  const { ix: initIx, estate } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
  });
  await client.sendTransaction(initIx);

  const { ix: firstRegisterIx, vaultTokenAccount } = await genRegisterAssetIx({
    client,
    authority,
    heir: heir.address,
    mint,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    amount: 100_000n,
  });
  await client.sendTransaction(firstRegisterIx);
  expect((await fetchEstate(client.rpc, estate)).data.claimableAssets).toBe(2);

  // Registering the same mint again must fail — otherwise claimable_assets
  // could be inflated without a matching real asset behind each increment.
  const { ix: secondRegisterIx } = await genRegisterAssetIx({
    client,
    authority,
    heir: heir.address,
    mint,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    amount: 1n,
  });
  await expect(client.sendTransaction(secondRegisterIx)).rejects.toThrow();

  expect((await fetchEstate(client.rpc, estate)).data.claimableAssets).toBe(2);
  expect((await fetchToken(client.rpc, vaultTokenAccount!)).data.amount).toBe(100_000n);
});
