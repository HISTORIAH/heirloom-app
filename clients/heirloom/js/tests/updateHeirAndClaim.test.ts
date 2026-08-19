import { expect, test } from "bun:test";
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022";
import { fetchToken } from "@solana-program/token-2022";
import {
  accountExists,
  createAndMintTokens,
  createTestClient,
  generateKeyPairSignerWithSol,
  genClaimIx,
  genInitSolEstateIx,
  genInitTokenEstateIx,
  genUpdateHeirIx,
} from "./setup";
import { fetchEstate } from "../src/generated";

test("init → update heir → claim SOL with new heir", async () => {
  const client = await createTestClient();
  const [authority, oldHeir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const newHeir = await generateKeyPairSignerWithSol(client);

  const { ix: initIx } = await genInitSolEstateIx({
    client,
    authority,
    heir: oldHeir,
    amount: 1_000_000_000n,
  });
  await client.sendTransaction(initIx);

  const { ix: updateHeirIx, newEstate, newVault } = await genUpdateHeirIx({
    client,
    authority,
    oldHeir: oldHeir.address,
    newHeir: newHeir.address,
  });
  await client.sendTransaction(updateHeirIx);

  const { ix: claimIx } = await genClaimIx({ client, authority: authority.address, heir: newHeir });
  await client.sendTransaction(claimIx);

  expect(await accountExists(client, newEstate)).toBe(false);
  expect(await accountExists(client, newVault)).toBe(false);
});

test("init → update heir → claim token with new heir", async () => {
  const client = await createTestClient();
  const [authority, oldHeir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const newHeir = await generateKeyPairSignerWithSol(client);
  const { mint } = await createAndMintTokens(client, authority);

  const { ix: initIx } = await genInitTokenEstateIx({
    client,
    authority,
    heir: oldHeir.address,
    mint,
    amount: 1_000_000n,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });
  await client.sendTransaction(initIx);

  const { ix: updateHeirTokenIx } = await genUpdateHeirIx({
    client,
    authority,
    oldHeir: oldHeir.address,
    newHeir: newHeir.address,
    mint,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });
  await client.sendTransaction(updateHeirTokenIx);

  // Final SOL-only call completes the migration and closes the old PDAs.
  const { ix: updateHeirSolIx, estate: oldEstate, vault: oldVault } = await genUpdateHeirIx({
    client,
    authority,
    oldHeir: oldHeir.address,
    newHeir: newHeir.address,
  });
  await client.sendTransaction(updateHeirSolIx);
  expect(await accountExists(client, oldEstate)).toBe(false);
  expect(await accountExists(client, oldVault)).toBe(false);

  const {
    ix: claimIx,
    estate: newEstate,
    heirTokenAccount,
    treasuryTokenAccount,
  } = await genClaimIx({
    client,
    authority: authority.address,
    heir: newHeir,
    mint,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });
  await client.sendTransaction(claimIx);

  // 1_000_000 at 75bps: 7_500 fee, 992_500 to the new heir.
  expect((await fetchToken(client.rpc, heirTokenAccount!)).data.amount).toBe(992_500n);
  expect((await fetchToken(client.rpc, treasuryTokenAccount!)).data.amount).toBe(7_500n);
  expect((await fetchEstate(client.rpc, newEstate)).data.claimableAssets).toBe(1);
});
