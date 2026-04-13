 import {
  type Address,
  appendTransactionMessageInstruction,
  type Commitment,
  type CompilableTransactionMessage,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  type KeyPairSigner,
  pipe,
  type Rpc,
  type RpcSubscriptions,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type SolanaRpcApi,
  type SolanaRpcSubscriptionsApi,
  type TransactionSigner,
} from "@solana/kit";
 import { assertIsSendableTransaction, assertIsTransactionWithBlockhashLifetime } from '@solana/transactions';
import { createClient } from "@solana/kit-client-rpc";

import fs from "fs";
import os from "os";
import path from "path";
import {
  associatedTokenProgram,
  TOKEN_PROGRAM_ADDRESS,
  tokenProgram,
} from "@solana-program/token";
import { systemProgram } from "@solana-program/system";
import {
  getInitializeInstructionAsync,
  getUpdateInstructionAsync,
  getRevokeInstructionAsync,
  getClaimInstructionAsync,
  getDelegateDeferInstructionAsync,
  HEIRLOOM_PROGRAM_PROGRAM_ADDRESS,
} from '@historiah/heirloom';

export type Client = {
  rpc: Rpc<SolanaRpcApi>;
  rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
};

export const createDefaultSolanaClient = (): Client => {
  const rpc = createSolanaRpc("http://127.0.0.1:8899");
  const rpcSubscriptions = createSolanaRpcSubscriptions("ws://127.0.0.1:8900");
  return { rpc, rpcSubscriptions };
};

export async function createProgramsClient() {
  const [authority] = await Promise.all([loadDefaultKeypair()]);

  return createClient({
    url: "http://127.0.0.1:8899",
    rpcSubscriptionsConfig: {
      url: "ws://127.0.0.1:8900",
    },
    payer: authority,
  })
    .use(tokenProgram())
    .use(associatedTokenProgram())
    .use(systemProgram());
}

export const createDefaultTransaction = async (
  client: Client,
  feePayer: TransactionSigner,
) => {
  const { value: latestBlockhash } = await client.rpc
    .getLatestBlockhash()
    .send();
  return pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  );
};

export const signAndSendTransaction = async (
  client: Client,
  transactionMessage: CompilableTransactionMessage,
  commitment: Commitment = "confirmed"
) => {
  const signedTransaction = await signTransactionMessageWithSigners(
    transactionMessage
  );
  assertIsSendableTransaction(signedTransaction);

  const signature = getSignatureFromTransaction(signedTransaction);

  assertIsTransactionWithBlockhashLifetime(signedTransaction);
  await sendAndConfirmTransactionFactory(client)(signedTransaction, {
    commitment,
    skipPreflight: true,
  });

  console.log("[DEBUG;] le signature ->", signature, "\n"); // ! debug
  return signature;
};

export async function loadKeypairFromFile(
  filePath: string,
): Promise<KeyPairSigner<string>> {
  // This is here so you can also load the default keypair from the file system.
  const resolvedPath = path.resolve(
    filePath.startsWith("~") ? filePath.replace("~", os.homedir()) : filePath,
  );
  const loadedKeyBytes = Uint8Array.from(
    JSON.parse(fs.readFileSync(resolvedPath, "utf8")),
  );
  // Here you can also set the second parameter to true in case you need to extract your private key.
  const keypairSigner = await createKeyPairSignerFromBytes(loadedKeyBytes);
  return keypairSigner;
}

export async function loadDefaultKeypair(): Promise<KeyPairSigner<string>> {
  return await loadKeypairFromFile("~/.config/solana/id.json");
}

// create and mint tokens to default default keypair
export async function createAndMintTokens() {
  let programsClient = await createProgramsClient();

  const mint = await generateKeyPairSigner();

  // Setup: create a mint before minting tokens to the payer's ATA.
  await programsClient.token.instructions
    .createMint({
      newMint: mint,
      decimals: 6,
      mintAuthority: programsClient.payer.address,
      freezeAuthority: programsClient.payer.address,
    })
    .sendTransaction();

  const result = await programsClient.token.instructions
    .mintToATA({
      mint: mint.address, // Mint for the token being minted.
      owner: programsClient.payer.address, // Account that owns the token account receiving the minted tokens.
      mintAuthority: programsClient.payer, // Authority allowed to mint new tokens.
      amount: 1_000_000_000n, // Token amount in base units(1000).
      decimals: 6, // Decimals defined on the mint account.
    })
    .sendTransaction();

  return { mint, TOKEN_PROGRAM_ADDRESS };
}

// ======================================================================================
// INSTRUCTIONS
// ======================================================================================
export const sendInitialize = async (
  client: Client,
  args: {
    vaultTokenAccount?: Address;
    tokenProgram?: Address;
    mint?: Address;
    amount: bigint;
    label: string;
    heartbeatInterval: bigint;
    gracePeriod: bigint;
    pauseDuration: bigint;
  },
): Promise<{ authority: Address; heir: KeyPairSigner }> => {
  const [authority, heir] = await Promise.all([
    loadDefaultKeypair(),
    generateKeyPairSigner(),
  ]);

  const { amount, label, gracePeriod, pauseDuration, heartbeatInterval } = args;

  const createIx = await getInitializeInstructionAsync({
    authority,
    heir: heir.address,
    heartbeatInterval,
    gracePeriod,
    pauseDuration,
    label,
    amount,
    tokenProgram: args.tokenProgram,
    mint: args.mint,
    vaultTokenAccount: args.vaultTokenAccount,
  });

  await pipe(
    await createDefaultTransaction(client, authority),
    (tx) => appendTransactionMessageInstruction(createIx, tx),
    (tx) => signAndSendTransaction(client, tx),
  );

  return { authority: authority.address, heir };
};

export const sendUpdate = async (
  client: Client,
): Promise<{ authority: Address; newHeir: KeyPairSigner }> => {
  const [authority, newHeir] = await Promise.all([
    loadDefaultKeypair(),
    generateKeyPairSigner(),
  ]);

  const ix = await getUpdateInstructionAsync({
    authority,
    heir: newHeir.address,
  });

  await pipe(
    await createDefaultTransaction(client, authority),
    (tx) => appendTransactionMessageInstruction(ix, tx),
    (tx) => signAndSendTransaction(client, tx),
  );

  return { authority: authority.address, newHeir };
};

export const sendRevoke = async (
  client: Client,
  args: {
    heir: Address;
    mint?: Address;
    tokenProgram?: Address;
    vaultTokenAccount?: Address;
    authorityTokenAccount?: Address;
  },
): Promise<{ authority: Address }> => {
  const authority = await loadDefaultKeypair();

  const ix = await getRevokeInstructionAsync({
    authority,
    heir: args.heir,
    mint: args.mint,
    tokenProgram: args.tokenProgram,
    vaultTokenAccount: args.vaultTokenAccount,
    authorityTokenAccount: args.authorityTokenAccount,
  });

  await pipe(
    await createDefaultTransaction(client, authority),
    (tx) => appendTransactionMessageInstruction(ix, tx),
    (tx) => signAndSendTransaction(client, tx),
  );

  return { authority: authority.address };
};

export const sendClaim = async (
  client: Client,
  args: {
    heir: TransactionSigner;
    mint?: Address;
    tokenProgram?: Address;
    vaultTokenAccount?: Address;
    heirTokenAccount?: Address;
    guardian?: Address;
  },
): Promise<{ heir: Address }> => {
  const authority = await loadDefaultKeypair();

  const ix = await getClaimInstructionAsync({
    heir: args.heir,
    authority: authority.address,
    mint: args.mint,
    tokenProgram: args.tokenProgram,
    vaultTokenAccount: args.vaultTokenAccount,
    heirTokenAccount: args.heirTokenAccount,
    guardian: args.guardian,
  });

  await pipe(
    await createDefaultTransaction(client, args.heir),
    (tx) => appendTransactionMessageInstruction(ix, tx),
    (tx) => signAndSendTransaction(client, tx),
  );

  return { heir: args.heir.address };
};

export const sendDelegateDefer = async (
  client: Client,
  args: {
    heir: Address;
  },
): Promise<{ delegate: KeyPairSigner }> => {
  const [authority, delegate] = await Promise.all([
    loadDefaultKeypair(),
    generateKeyPairSigner(),
  ]);

  const ix = await getDelegateDeferInstructionAsync({
    delegate,
    authority: authority.address,
    heir: args.heir,
  });

  await pipe(
    await createDefaultTransaction(client, delegate),
    (tx) => appendTransactionMessageInstruction(ix, tx),
    (tx) => signAndSendTransaction(client, tx),
  );

  return { delegate };
};
