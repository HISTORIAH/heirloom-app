import { expect, test } from "bun:test";
import {
  createDefaultSolanaClient,
  sendInitialize,
  sendUpdateHeir,
  sendClaim,
  loadDefaultKeypair,
  createAndMintTokens,
} from "./setup";
import { generateKeyPairSigner, lamports } from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { findEstatePda, findVaultPda } from "@historiah/heirloom";

test("init → update heir → claim SOL with new heir", async () => {
  const authority = await loadDefaultKeypair();
  const client = createDefaultSolanaClient();

  const { heir: oldHeir } = await sendInitialize(client, {
    amount: BigInt(100_000),
    label: "test-heir-migration-sol",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });

  const newHeir = await generateKeyPairSigner();
  await client.rpc.requestAirdrop(newHeir.address, lamports(100000n)).send();

  await sendUpdateHeir(client, {
    newHeir: newHeir.address,
    oldHeir: oldHeir.address,
  });

  // claim
  let [newVault] = await findVaultPda({ authority: authority.address, heir: newHeir.address });
  let [newEstate] = await findEstatePda({ authority: authority.address, heir: newHeir.address });

  await sendClaim(client, { heir: newHeir, estate: newEstate, vault: newVault });

  expect(newHeir.address).toBeTruthy();
});

test("init → update heir → claim token with new heir", async () => {
  const client = createDefaultSolanaClient();
  const authority = await loadDefaultKeypair();
  const oldHeir = await generateKeyPairSigner();
  const newHeir = await generateKeyPairSigner();

  await client.rpc.requestAirdrop(newHeir.address, lamports(10000000n)).send();
  const balance = await client.rpc.getBalance(newHeir.address).send()
  console.log("new heir lamports balance", balance.value.toString()); // ! debug statement

  const { mint } = await createAndMintTokens();

  const [oldVault] = await findVaultPda({ authority: authority.address, heir: oldHeir.address });
  const [oldVaultTokenAccount] = await findAssociatedTokenPda({
    owner: oldVault,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  const [authorityTokenAccount] = await findAssociatedTokenPda({
    owner: authority.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

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

  // claim with new heir
  const [newVault] = await findVaultPda({ authority: authority.address, heir: newHeir.address });
  const [newEstate] = await findEstatePda({ authority: authority.address, heir: newHeir.address });
  const [newVaultTokenAccount] = await findAssociatedTokenPda({
    owner: newVault,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  const [heirTokenAccount] = await findAssociatedTokenPda({
    owner: newHeir.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  await sendClaim(client, {
    heir: newHeir,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount: newVaultTokenAccount,
    heirTokenAccount,
    vault: newVault,
    estate: newEstate
  });

  expect(newHeir.address).toBeTruthy();
});
