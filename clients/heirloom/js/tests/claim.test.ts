import { expect, test } from "bun:test";
import { generateKeyPairSigner, lamports } from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { TREASURY_ADDRESS } from "../src/main";
import {
  accountExists,
  calculateFee,
  createTestContext,
  createAndMintTokens,
  createHeir,
  createProgramsClient,
  deriveEstateVault,
  deriveTokenAccounts,
  getEstate,
  getLamportBalance,
  getTokenBalance,
  sendClaim,
  sendInitialize,
} from "./setup";

test("it claims a native SOL vault", async () => {
  const { client } = await createTestContext();

  const { authority, heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000), // one sol
    label: "test-claim-sol",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });

  const { estate, vault } = await deriveEstateVault(authority, heir.address);
  const [vaultBalanceBefore, treasuryBalanceBefore, heirBalanceBefore] = await Promise.all([
    getLamportBalance(client, vault),
    getLamportBalance(client, TREASURY_ADDRESS),
    getLamportBalance(client, heir.address),
  ]);
  const expectedFee = calculateFee(vaultBalanceBefore, 75n);

  await sendClaim(client, { heir });

  const [treasuryBalanceAfter, heirBalanceAfter] = await Promise.all([
    getLamportBalance(client, TREASURY_ADDRESS),
    getLamportBalance(client, heir.address),
  ]);
  expect(treasuryBalanceAfter - treasuryBalanceBefore).toBe(expectedFee);
  expect(heirBalanceAfter).toBeGreaterThan(heirBalanceBefore);
  expect(await accountExists(client, estate)).toBe(false);
  expect(await accountExists(client, vault)).toBe(false);
});

test("it rejects claiming an already-claimed vault", async () => {
  const { client } = await createTestContext();

  const { authority, heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "test-double-claim",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });

  const { estate, vault } = await deriveEstateVault(authority, heir.address);

  await sendClaim(client, { heir });

  expect(await accountExists(client, estate)).toBe(false);
  expect(await accountExists(client, vault)).toBe(false);
  expect(sendClaim(client, { heir, estate, vault })).rejects.toThrow();
});

test("it claims a token vault", async () => {
  const { client, authority } = await createTestContext();
  const { mint } = await createAndMintTokens();
  const heir = await createHeir(client);

  const { vault, estate } = await deriveEstateVault(authority.address, heir.address);
  const { vaultTokenAccount, authorityTokenAccount, heirTokenAccount, treasuryTokenAccount } =
    await deriveTokenAccounts(vault, authority.address, heir.address, mint.address);

  await sendInitialize(client, {
    amount: 1_000_000n,
    label: "test-heir-migration-token",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount,
    heir,
    authorityTokenAccount,
  });

  expect(await getTokenBalance(client, vaultTokenAccount)).toBe(1_000_000n);
  expect((await getEstate(client, estate)).data.claimableAssets).toBe(2);

  await sendClaim(client, {
    heir,
    mint: mint.address,
    vaultTokenAccount,
    heirTokenAccount,
    treasuryTokenAccount,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  expect(await getTokenBalance(client, heirTokenAccount)).toBe(992_500n);
  expect(await getTokenBalance(client, treasuryTokenAccount)).toBe(7_500n);
  expect(await accountExists(client, vaultTokenAccount)).toBe(false);
  expect((await getEstate(client, estate)).data.claimableAssets).toBe(1);

  const [vaultBalanceBefore, treasuryBalanceBefore] = await Promise.all([
    getLamportBalance(client, vault),
    getLamportBalance(client, TREASURY_ADDRESS),
  ]);
  await sendClaim(client, { heir, estate, vault });

  expect((await getLamportBalance(client, TREASURY_ADDRESS)) - treasuryBalanceBefore).toBe(
    calculateFee(vaultBalanceBefore, 75n),
  );
  expect(await accountExists(client, estate)).toBe(false);
  expect(await accountExists(client, vault)).toBe(false);
});

test("it rejects a claim before the estate is claimable", async () => {
  const { client } = await createTestContext();
  const { authority, heir } = await sendInitialize(client, {
    amount: 1_000_000_000n,
    label: "test-claim-too-early",
    heartbeatInterval: 86_400n,
    gracePeriod: 3_600n,
    pauseDuration: 0n,
  });
  const { estate, vault } = await deriveEstateVault(authority, heir.address);
  const vaultBalanceBefore = await getLamportBalance(client, vault);

  expect(sendClaim(client, { heir, estate, vault })).rejects.toThrow();

  expect(await getLamportBalance(client, vault)).toBe(vaultBalanceBefore);
  expect((await getEstate(client, estate)).data.claimableAssets).toBe(1);
});

test("it rejects a claim signed by a wallet other than the heir", async () => {
  const { client } = await createTestContext();
  const { authority, heir } = await sendInitialize(client, {
    amount: 1_000_000_000n,
    label: "test-claim-unauthorized",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });
  const unauthorizedHeir = await generateKeyPairSigner();
  await client.rpc.requestAirdrop(unauthorizedHeir.address, lamports(10_000_000n)).send();

  const { estate, vault } = await deriveEstateVault(authority, heir.address);
  const vaultBalanceBefore = await getLamportBalance(client, vault);

  expect(sendClaim(client, { heir: unauthorizedHeir, estate, vault })).rejects.toThrow();

  expect(await getLamportBalance(client, vault)).toBe(vaultBalanceBefore);
  expect((await getEstate(client, estate)).data.heir).toBe(heir.address);
});

test("it rejects claiming a vault-owned token account that was never registered", async () => {
  const { client, authority } = await createTestContext();
  const heir = await createHeir(client);
  const { mint } = await createAndMintTokens();

  await sendInitialize(client, {
    heir,
    amount: 1_000_000_000n,
    label: "test-fake-asset-claim",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });

  const { estate, vault } = await deriveEstateVault(authority.address, heir.address);
  const { vaultTokenAccount, heirTokenAccount, treasuryTokenAccount } = await deriveTokenAccounts(
    vault,
    authority.address,
    heir.address,
    mint.address,
  );

  // Fund the vault's ATA directly, bypassing register_asset entirely — no
  // AssetRecord is ever created for this mint.
  const programsClient = await createProgramsClient();
  await programsClient.token.instructions
    .mintToATA({
      mint: mint.address,
      owner: vault,
      mintAuthority: programsClient.payer,
      amount: 500_000n,
      decimals: 6,
    })
    .sendTransaction();
  expect(await getTokenBalance(client, vaultTokenAccount)).toBe(500_000n);

  const vaultBalanceBefore = await getLamportBalance(client, vault);

  expect(
    sendClaim(client, {
      heir,
      mint: mint.address,
      vaultTokenAccount,
      heirTokenAccount,
      treasuryTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    }),
  ).rejects.toThrow();

  // A fabricated token slot must not be able to decrement the counter and
  // trigger close_pda — the SOL-only estate stays fully intact.
  expect(await getLamportBalance(client, vault)).toBe(vaultBalanceBefore);
  expect((await getEstate(client, estate)).data.claimableAssets).toBe(1);
  expect(await accountExists(client, estate)).toBe(true);
  expect(await accountExists(client, vault)).toBe(true);
});
