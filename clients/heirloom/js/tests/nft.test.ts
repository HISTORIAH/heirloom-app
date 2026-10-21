import { expect, test } from "bun:test";
import { fetchToken, TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022";
import {
  accountExists,
  createAndMintTokens,
  createNft,
  createTestClient,
  fundTreasury,
  generateKeyPairSignerWithSol,
  genClaimIx,
  genInitSolEstateIx,
  genInitTokenEstateIx,
  genRegisterAssetIx,
  genRevokeIx,
  getLamports,
} from "./setup";
import { NFT_DEPOSIT_FEE_LAMPORTS, TREASURY_ADDRESS } from "../src/main";

async function setupNftEstate() {
  const client = await createTestClient();
  await fundTreasury(client);
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const { mint, authorityAta } = await createNft(client, authority);

  const { ix: initIx } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
  });
  await client.sendTransaction(initIx);

  const { ix: registerIx, vaultTokenAccount } = await genRegisterAssetIx({
    client,
    authority,
    heir: heir.address,
    mint,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    amount: 1n,
  });

  return { client, authority, heir, mint, authorityAta, registerIx, vaultTokenAccount: vaultTokenAccount! };
}

test("it charges the flat NFT fee when registering an NFT", async () => {
  const { client, registerIx, vaultTokenAccount } = await setupNftEstate();

  const treasuryBalanceBefore = await getLamports(client, TREASURY_ADDRESS);
  await client.sendTransaction(registerIx);
  const treasuryBalanceAfter = await getLamports(client, TREASURY_ADDRESS);

  expect(treasuryBalanceAfter - treasuryBalanceBefore).toBe(NFT_DEPOSIT_FEE_LAMPORTS);
  expect((await fetchToken(client.rpc, vaultTokenAccount)).data.amount).toBe(1n);
});

// TODO(nft-fee): unskip once `initialize` takes the treasury account again.
test.skip("it charges the flat NFT fee when initializing with an NFT", async () => {
  const client = await createTestClient();
  await fundTreasury(client);
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const { mint } = await createNft(client, authority);

  const treasuryBalanceBefore = await getLamports(client, TREASURY_ADDRESS);
  const { ix: initIx, vaultTokenAccount } = await genInitTokenEstateIx({
    client,
    authority,
    heir: heir.address,
    mint,
    amount: 1n,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });
  await client.sendTransaction(initIx);
  const treasuryBalanceAfter = await getLamports(client, TREASURY_ADDRESS);

  expect(treasuryBalanceAfter - treasuryBalanceBefore).toBe(NFT_DEPOSIT_FEE_LAMPORTS);
  expect((await fetchToken(client.rpc, vaultTokenAccount)).data.amount).toBe(1n);
});

test("it does not charge the NFT fee when registering a fungible token", async () => {
  const client = await createTestClient();
  await fundTreasury(client);
  const [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const { mint } = await createAndMintTokens(client, authority);

  const { ix: initIx } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount: 1_000_000_000n,
  });
  await client.sendTransaction(initIx);

  const treasuryBalanceBefore = await getLamports(client, TREASURY_ADDRESS);
  const { ix: registerIx } = await genRegisterAssetIx({
    client,
    authority,
    heir: heir.address,
    mint,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    amount: 1_000_000n,
  });
  await client.sendTransaction(registerIx);

  expect(await getLamports(client, TREASURY_ADDRESS)).toBe(treasuryBalanceBefore);
});

test("it gives the heir the whole NFT on claim, with no fee taken", async () => {
  const { client, authority, heir, mint, registerIx } = await setupNftEstate();
  await client.sendTransaction(registerIx);

  const { ix: claimIx, heirTokenAccount, treasuryTokenAccount } = await genClaimIx({
    client,
    authority: authority.address,
    heir,
    mint,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });
  await client.sendTransaction(claimIx);

  expect((await fetchToken(client.rpc, heirTokenAccount!)).data.amount).toBe(1n);
  expect(await accountExists(client, treasuryTokenAccount!)).toBe(false);
});

test("it returns the whole NFT to the authority on revoke, with no fee taken", async () => {
  const { client, authority, heir, mint, authorityAta, registerIx } = await setupNftEstate();
  await client.sendTransaction(registerIx);

  const { ix: revokeIx, treasuryTokenAccount } = await genRevokeIx({
    client,
    authority,
    heir: heir.address,
    mint,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });
  await client.sendTransaction(revokeIx);

  expect((await fetchToken(client.rpc, authorityAta)).data.amount).toBe(1n);
  expect(await accountExists(client, treasuryTokenAccount!)).toBe(false);
});
