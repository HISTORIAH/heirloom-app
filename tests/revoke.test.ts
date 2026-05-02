import { test } from "bun:test";
import {
  generateKeyPairSigner,
  lamports,
} from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  findEstatePda,
  findVaultPda,
} from "@historiah/heirloom";
import {
  createDefaultSolanaClient,
  createAndMintTokens,
  loadDefaultKeypair,
  sendInitialize,
  sendRevoke,
  sendUpdateHeir,
} from "./setup";

test("it creates a token-only vault and revokes it", async () => {
  const client = createDefaultSolanaClient();
  const authority = await loadDefaultKeypair();
  const heir = await generateKeyPairSigner();
  const { mint } = await createAndMintTokens();

  await client.rpc.requestAirdrop(heir.address, lamports(10_000_000n)).send();

  let [vault] = await findVaultPda({ authority: authority.address, heir: heir.address });
  let [estate] = await findEstatePda({ authority: authority.address, heir: heir.address });

  const [vaultTokenAccount] = await findAssociatedTokenPda({
    owner: vault,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const [authorityTokenAccount] = await findAssociatedTokenPda({
    owner: authority.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  // Init with token as the sole primary asset — no SOL deposit
  await sendInitialize(client, {
    heir ,
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

  // Revoke token — claimable_assets drops to 0 so program closes estate + vault
  await sendRevoke(client, {
    heir: heir.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount,
    authorityTokenAccount,
    vault,
    estate
  });
});

test("it creates a token-only vault, updates heir and revokes it", async () => {
  const client = createDefaultSolanaClient();
  const authority = await loadDefaultKeypair();
  const heir = await generateKeyPairSigner();
  const newHeir = await generateKeyPairSigner();

  const { mint } = await createAndMintTokens();

  await client.rpc.requestAirdrop(heir.address, lamports(10_000_000n)).send();

  let [vault] = await findVaultPda({ authority: authority.address, heir: heir.address });
  let [estate] = await findEstatePda({ authority: authority.address, heir: heir.address });

  const [vaultTokenAccount] = await findAssociatedTokenPda({
    owner: vault,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const [authorityTokenAccount] = await findAssociatedTokenPda({
    owner: authority.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const [newVaultAddress] = await findVaultPda({
    authority: authority.address,
    heir: newHeir.address,
  });

  const [newVaultTokenAccount] = await findAssociatedTokenPda({
    owner: newVaultAddress,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  // Init with token as the sole primary asset — no SOL deposit
  await sendInitialize(client, {
    heir ,
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
    oldHeir: heir.address, // old heir
    vaultTokenAccount: vaultTokenAccount, // old token account
  });

  // Revoke token — claimable_assets drops to 0 so program closes estate + vault
  let [newVault] = await findVaultPda({ authority: authority.address, heir: newHeir.address });
  let [newEstate] = await findEstatePda({ authority: authority.address, heir: newHeir.address });

  await sendRevoke(client, {
    heir: newHeir.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount: newVaultTokenAccount,
    authorityTokenAccount,
    vault: newVault,
    estate: newEstate
  });
});
