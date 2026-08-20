import { expect, test } from "bun:test";
import {
  createAndMintTokens,
  createTestClient,
  expectHeirloomError,
  generateKeyPairSignerWithSol,
  genInitSolEstateIx,
  genInitTokenEstateIx,
} from "./setup";
import { fetchToken, TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022";
import { fetchAssetRecord, fetchEstate, fetchVault } from "../src/generated";
import { HEIRLOOM_ERROR__ZERO_DEPOSIT_AMOUNT } from "../src/generated/errors";
import { sol, solToLamports } from "@solana/kit";

test("it creates a native solana estate", async () => {
  const client = await createTestClient();
  let [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  let amount = solToLamports(sol("1"));

  // init sol tx
  let { ix, estate, vault } = await genInitSolEstateIx({
    client,
    authority,
    heir,
    amount, // ! in lamports
  });

  await client.sendTransaction(ix);

  let vaultBal = (await client.rpc.getBalance(vault).send()).value;
  const [estateAccData] = await Promise.all([fetchEstate(client.rpc, estate)]);

  expect(estateAccData.data.claimableAssets).toBe(1);
  expect(estateAccData.data.label).toBe("test-sol");
  expect(vaultBal >= 1_000_000_000n).toBe(true);
});

test("it creates a token solana estate", async () => {
  const client = await createTestClient();
  let [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  let { mint } = await createAndMintTokens(client, authority);
  let amount = 1_000_000n; // 1 token

  // init sol tx
  let {
    ix: initTokenIx,
    estate,
    assetRecord,
    vaultTokenAccount,
  } = await genInitTokenEstateIx({
    client,
    authority,
    heir: heir.address,
    mint,
    amount,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });

  await client.sendTransaction(initTokenIx);

  const [estateAccData, assetRecordAccData, vaultTokenAccData] = await Promise.all([
    fetchEstate(client.rpc, estate),
    fetchAssetRecord(client.rpc, assetRecord),
    fetchToken(client.rpc, vaultTokenAccount),
  ]);

  expect(estateAccData.data.claimableAssets).toBe(2);
  expect(estateAccData.data.label).toBe("test-tokens");
  expect(assetRecordAccData.data.principalDeployed).toBe(0n);
  expect(vaultTokenAccData.data.amount).toBe(amount);
});

test("it rejects initializing a token-only estate with a zero amount", async () => {
  const client = await createTestClient();
  let [authority, heir] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);

  let { mint } = await createAndMintTokens(client, authority);

  let { ix } = await genInitTokenEstateIx({
    client,
    authority,
    heir: heir.address,
    mint,
    amount: 0n,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });

  await expectHeirloomError(client.sendTransaction(ix), HEIRLOOM_ERROR__ZERO_DEPOSIT_AMOUNT);
});
