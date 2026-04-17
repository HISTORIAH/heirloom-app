import { test } from "bun:test";
import {
  appendTransactionMessageInstruction,
  generateKeyPairSigner,
  lamports,
  pipe,
} from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  getInitializeInstructionAsync,
  getRegisterAssetInstructionAsync,
  findVaultPda,
} from "@historiah/heirloom";
import {
  createDefaultSolanaClient,
  createDefaultTransaction,
  createAndMintTokens,
  loadDefaultKeypair,
  sendInitialize,
  sendRegisterAsset,
  signAndSendTransaction,
} from "./setup";

test("it bundles init and register token in one transaction", async () => {
  const client = createDefaultSolanaClient();
  const authority = await loadDefaultKeypair();
  const heir = await generateKeyPairSigner();
  const { mint } = await createAndMintTokens();

  await client.rpc.requestAirdrop(heir.address, lamports(10_000_000n)).send();

  const [vaultPda] = await findVaultPda({
    authority: authority.address,
    heir: heir.address,
  });

  const [vaultTokenAccount] = await findAssociatedTokenPda({
    owner: vaultPda,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });


  const [authorityTokenAccount] = await findAssociatedTokenPda({
    owner: authority.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const initIx = await getInitializeInstructionAsync({
    authority,
    heir: heir.address,
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    label: "test-register",
    amount: 100_000n,
  });

  const registerIx = await getRegisterAssetInstructionAsync({
    authority,
    heir: heir.address,
    mint: mint.address,
    vaultTokenAccount,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    amount: 1_000_000,
    authorityTokenAccount
  });

  await pipe(
    await createDefaultTransaction(client, authority),
    (tx) => appendTransactionMessageInstruction(initIx, tx),
    (tx) => appendTransactionMessageInstruction(registerIx, tx),
    (tx) => signAndSendTransaction(client, tx),
  );
});

test("it inits with a token then registers a SOL asset separately", async () => {
  const client = createDefaultSolanaClient();
  const { mint } = await createAndMintTokens();
  const authority = await loadDefaultKeypair();
  const heir = await generateKeyPairSigner();

  await client.rpc.requestAirdrop(heir.address, lamports(10_000_000n)).send();

  const [vaultPda] = await findVaultPda({
    authority: authority.address,
    heir: heir.address,
  });

  const [vaultTokenAccount] = await findAssociatedTokenPda({
    owner: vaultPda,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });


  const [authorityTokenAccount] = await findAssociatedTokenPda({
    owner: authority.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  // Init estate with a token registered in the same tx
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
    authorityTokenAccount
  });

  // Register SOL asset (no mint) in a separate tx
  await sendRegisterAsset(client, {
    heir: heir.address,
    amount: 5_000_000_000n,
  });
});
