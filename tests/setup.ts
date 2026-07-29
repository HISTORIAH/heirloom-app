import {
  address,
  type Address,
  appendTransactionMessageInstruction,
  type Commitment,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  type Instruction,
  type KeyPairSigner,
  lamports,
  pipe,
  type Rpc,
  type RpcSubscriptions,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type SolanaRpcApi,
  type SolanaRpcSubscriptionsApi,
  type TransactionMessage,
  type TransactionMessageWithFeePayer,
  type TransactionSigner,
} from "@solana/kit";
import {
  assertIsSendableTransaction,
  assertIsTransactionWithBlockhashLifetime,
} from "@solana/transactions";
import { createClient } from "@solana/kit-client-rpc";

import fs from "fs";
import os from "os";
import path from "path";
import {
  associatedTokenProgram,
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
  tokenProgram,
} from "@solana-program/token";
import { systemProgram } from "@solana-program/system";
import {
  getInitializeInstructionAsync,
  getUpdateHeirInstructionAsync,
  getRevokeInstructionAsync,
  getClaimInstructionAsync,
  getDelegateDeferInstructionAsync,
  getRegisterAssetInstructionAsync,
  getUpdateFieldInstruction,
  fetchEstate,
  findEstatePda,
  findVaultPda,
  findAssetRecordPda,
  TREASURY_ADDRESS,
} from "@historiah/heirloom";

export type Client = {
  rpc: Rpc<SolanaRpcApi>;
  rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
};

export const createDefaultSolanaClient = (): Client => {
  const rpc = createSolanaRpc("http://127.0.0.1:8899");
  const rpcSubscriptions = createSolanaRpcSubscriptions("ws://127.0.0.1:8900");
  return { rpc, rpcSubscriptions };
};

export const createDevnetSolanaClient = (): Client => {
  const rpc = createSolanaRpc("https://api.devnet.solana.com");
  const rpcSubscriptions = createSolanaRpcSubscriptions("wss://api.devnet.solana.com/");
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

export const createDefaultTransaction = async (client: Client, feePayer: TransactionSigner) => {
  const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();
  return pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  );
};

export const signAndSendTransaction = async (
  client: Client,
  transactionMessage: TransactionMessage & TransactionMessageWithFeePayer,
  commitment: Commitment = "confirmed",
) => {
  const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
  assertIsSendableTransaction(signedTransaction);

  const signature = getSignatureFromTransaction(signedTransaction);

  assertIsTransactionWithBlockhashLifetime(signedTransaction);
  await sendAndConfirmTransactionFactory(client)(signedTransaction, {
    commitment,
    skipPreflight: true,
  });

  return signature;
};

// ---------------------------------------------------------------------------
// Transaction helpers
// ---------------------------------------------------------------------------

export async function sendInstruction(
  client: Client,
  feePayer: TransactionSigner,
  instruction: Instruction,
) {
  await pipe(
    await createDefaultTransaction(client, feePayer),
    (tx) => appendTransactionMessageInstruction(instruction, tx),
    (tx) => signAndSendTransaction(client, tx),
  );
}

export async function sendInstructions(
  client: Client,
  feePayer: TransactionSigner,
  instructions: Instruction[],
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tx: any = await createDefaultTransaction(client, feePayer);
  for (const ix of instructions) {
    tx = appendTransactionMessageInstruction(ix, tx);
  }
  await signAndSendTransaction(client, tx);
}

// ---------------------------------------------------------------------------
// Keypair helpers
// ---------------------------------------------------------------------------

export async function loadKeypairFromFile(filePath: string): Promise<KeyPairSigner<string>> {
  const resolvedPath = path.resolve(
    filePath.startsWith("~") ? filePath.replace("~", os.homedir()) : filePath,
  );
  const loadedKeyBytes = Uint8Array.from(JSON.parse(fs.readFileSync(resolvedPath, "utf8")));
  return createKeyPairSignerFromBytes(loadedKeyBytes);
}

export async function loadDefaultKeypair(): Promise<KeyPairSigner<string>> {
  return loadKeypairFromFile("~/.config/solana/id.json");
}

export async function loadDefaultClaimKeypair(): Promise<KeyPairSigner<string>> {
  return loadKeypairFromFile("~/.config/solana/id-new.json");
}

// ---------------------------------------------------------------------------
// Test context helpers
// ---------------------------------------------------------------------------

export async function createTestContext() {
  const client = createDefaultSolanaClient();
  const authority = await loadDefaultKeypair();
  return { client, authority };
}

export async function createHeir(
  client: Client,
  airdropLamports = 10_000_000n,
): Promise<KeyPairSigner<string>> {
  const heir = await generateKeyPairSigner();
  await client.rpc.requestAirdrop(heir.address, lamports(airdropLamports)).send();
  return heir;
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export async function createAndMintTokens() {
  const programsClient = await createProgramsClient();

  const mint = await generateKeyPairSigner();

  await programsClient.token.instructions
    .createMint({
      newMint: mint,
      decimals: 6,
      mintAuthority: programsClient.payer.address,
      freezeAuthority: programsClient.payer.address,
    })
    .sendTransaction();

  await programsClient.token.instructions
    .mintToATA({
      mint: mint.address,
      owner: programsClient.payer.address,
      mintAuthority: programsClient.payer,
      amount: 1_000_000_000n,
      decimals: 6,
    })
    .sendTransaction();

  return { mint, TOKEN_PROGRAM_ADDRESS };
}

export async function deriveAta(
  owner: Address,
  mint: Address,
  tokenProgram: Address = TOKEN_PROGRAM_ADDRESS,
): Promise<Address> {
  const [ata] = await findAssociatedTokenPda({ owner, mint, tokenProgram });
  return ata;
}

export async function deriveTokenAccounts(
  vault: Address,
  authority: Address,
  heir: Address,
  mint: Address,
  tokenProgram: Address = TOKEN_PROGRAM_ADDRESS,
) {
  const [vaultTokenAccount, authorityTokenAccount, heirTokenAccount, treasuryTokenAccount] =
    await Promise.all([
      deriveAta(vault, mint, tokenProgram),
      deriveAta(authority, mint, tokenProgram),
      deriveAta(heir, mint, tokenProgram),
      deriveAta(TREASURY_ADDRESS, mint, tokenProgram),
    ]);
  return { vaultTokenAccount, authorityTokenAccount, heirTokenAccount, treasuryTokenAccount };
}

// ---------------------------------------------------------------------------
// PDA helpers
// ---------------------------------------------------------------------------

export async function deriveEstateVault(authority: Address, heir: Address) {
  const [[estate], [vault]] = await Promise.all([
    findEstatePda({ authority, heir }),
    findVaultPda({ authority, heir }),
  ]);
  return { estate, vault };
}

export async function deriveAssetRecord(estate: Address, mint: Address): Promise<Address> {
  const [assetRecord] = await findAssetRecordPda({ estate, mint });
  return assetRecord;
}

export async function getLamportBalance(client: Client, account: Address): Promise<bigint> {
  return (await client.rpc.getBalance(account, { commitment: "confirmed" }).send()).value;
}

export async function getTokenBalance(client: Client, tokenAccount: Address): Promise<bigint> {
  const balance = await client.rpc
    .getTokenAccountBalance(tokenAccount, { commitment: "confirmed" })
    .send();
  return BigInt(balance.value.amount);
}

export async function accountExists(client: Client, account: Address): Promise<boolean> {
  return (
    (await client.rpc.getAccountInfo(account, { commitment: "confirmed" }).send()).value !== null
  );
}

export async function getEstate(client: Client, estate: Address) {
  return fetchEstate(client.rpc, estate, { commitment: "confirmed" });
}

export function calculateFee(amount: bigint, basisPoints: bigint): bigint {
  return (amount * basisPoints) / 10_000n;
}

// ---------------------------------------------------------------------------
// Instruction wrappers
// ---------------------------------------------------------------------------

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
    heir?: KeyPairSigner;
    authorityTokenAccount?: Address;
    hbSigner?: Address;
  },
): Promise<{ authority: Address; heir: KeyPairSigner }> => {
  const [authority, heir] = await Promise.all([
    loadDefaultKeypair(),
    args.heir ?? generateKeyPairSigner(),
  ]);

  await client.rpc.requestAirdrop(heir.address, lamports(1_000_000_00n)).send();

  const { amount, label, gracePeriod, pauseDuration, heartbeatInterval } = args;

  const [vault] = await findVaultPda({
    authority: authority.address,
    heir: heir.address,
  });
  const [estate] = await findEstatePda({
    authority: authority.address,
    heir: heir.address,
  });

  const assetRecord = args.mint ? await deriveAssetRecord(estate, args.mint) : undefined;

  const ix = await getInitializeInstructionAsync({
    authority,
    heir: heir.address,
    heartbeatInterval,
    gracePeriod,
    pauseDuration,
    label,
    amount,
    vault,
    estate,
    tokenProgram: args.tokenProgram,
    mint: args.mint,
    vaultTokenAccount: args.vaultTokenAccount,
    authorityTokenAccount: args.authorityTokenAccount,
    hbSigner: args.hbSigner,
    assetRecord,
  });

  await sendInstruction(client, authority, ix);
  return { authority: authority.address, heir };
};

export const sendUpdateFields = async (
  client: Client,
  args: {
    heir: Address;
    heartbeatInterval?: bigint;
    gracePeriod?: bigint;
    pauseDuration?: bigint;
    label?: string;
    signer?: TransactionSigner;
    authority?: Address;
  },
): Promise<{ authority: Address }> => {
  const signer = args.signer ?? (await loadDefaultKeypair());
  const authority = args.authority ?? signer.address;

  const [estate] = await findEstatePda({
    authority,
    heir: args.heir,
  });

  const ix = getUpdateFieldInstruction({
    authority: signer,
    heir: args.heir,
    heartbeatInterval: args.heartbeatInterval ?? null,
    estate,
    gracePeriod: args.gracePeriod ?? null,
    pauseDuration: args.pauseDuration ?? null,
    label: args.label ?? null,
  });

  await sendInstruction(client, signer, ix);
  return { authority: signer.address };
};

export const sendUpdateHeir = async (
  client: Client,
  args: {
    newHeir: Address;
    oldHeir: Address;
    mint?: Address;
    tokenProgram?: Address;
    vaultTokenAccount?: Address;
  },
): Promise<{ authority: Address; newEstate: Address; newVault: Address }> => {
  const authority = await loadDefaultKeypair();
  const { newHeir, oldHeir, tokenProgram, mint } = args;

  const [[newEstate], [newVault], [estate], [vault]] = await Promise.all([
    findEstatePda({ authority: authority.address, heir: newHeir }),
    findVaultPda({ authority: authority.address, heir: newHeir }),
    findEstatePda({ authority: authority.address, heir: oldHeir }),
    findVaultPda({ authority: authority.address, heir: oldHeir }),
  ]);

  let newVaultTokenAccount: Address | undefined;
  let assetRecord: Address | undefined;
  let newAssetRecord: Address | undefined;
  if (mint && tokenProgram) {
    newVaultTokenAccount = await deriveAta(newVault, mint, tokenProgram);
    [assetRecord, newAssetRecord] = await Promise.all([
      deriveAssetRecord(estate, mint),
      deriveAssetRecord(newEstate, mint),
    ]);
  }

  const ix = await getUpdateHeirInstructionAsync({
    authority,
    heir: oldHeir,
    newHeir,
    newEstate,
    newVault,
    mint: args.mint,
    vault,
    estate,
    tokenProgram: args.tokenProgram,
    assetRecord,
    newAssetRecord,
    vaultTokenAccount: args.vaultTokenAccount,
    newVaultTokenAccount,
  });

  await sendInstruction(client, authority, ix);
  return { authority: authority.address, newEstate, newVault };
};

export const sendRevoke = async (
  client: Client,
  args: {
    heir: Address;
    mint?: Address;
    vault?: Address;
    estate?: Address;
    tokenProgram?: Address;
    vaultTokenAccount?: Address;
    treasuryTokenAccount?: Address;
    authorityTokenAccount?: Address;
  },
): Promise<{ authority: Address }> => {
  const authority = await loadDefaultKeypair();

  const { vault, estate } =
    args.vault && args.estate
      ? { vault: args.vault, estate: args.estate }
      : await deriveEstateVault(authority.address, args.heir);

  const assetRecord = args.mint ? await deriveAssetRecord(estate, args.mint) : undefined;

  const ix = await getRevokeInstructionAsync({
    authority,
    heir: args.heir,
    mint: args.mint,
    vault,
    estate,
    tokenProgram: args.tokenProgram,
    vaultTokenAccount: args.vaultTokenAccount,
    authorityTokenAccount: args.authorityTokenAccount,
    treasuryTokenAccount: args.treasuryTokenAccount,
    treasury: TREASURY_ADDRESS,
    assetRecord,
  });

  await sendInstruction(client, authority, ix);
  return { authority: authority.address };
};

export const sendClaim = async (
  client: Client,
  args: {
    heir: TransactionSigner;
    mint?: Address;
    vault?: Address;
    estate?: Address;
    tokenProgram?: Address;
    vaultTokenAccount?: Address;
    heirTokenAccount?: Address;
    treasuryTokenAccount?: Address;
    delegate?: Address;
  },
): Promise<{ heir: Address }> => {
  const authority = await loadDefaultKeypair();
  const heir = args.heir;

  const { vault, estate } =
    args.vault && args.estate
      ? { vault: args.vault, estate: args.estate }
      : await deriveEstateVault(authority.address, heir.address);

  const assetRecord = args.mint ? await deriveAssetRecord(estate, args.mint) : undefined;

  const ix = await getClaimInstructionAsync({
    heir,
    authority: authority.address,
    mint: args.mint,
    tokenProgram: args.tokenProgram,
    vaultTokenAccount: args.vaultTokenAccount,
    heirTokenAccount: args.heirTokenAccount,
    vault,
    estate,
    delegate: args.delegate,
    treasury: TREASURY_ADDRESS,
    treasuryTokenAccount: args.treasuryTokenAccount,
    assetRecord,
  });

  await sendInstruction(client, heir, ix);
  return { heir: heir.address };
};

export const sendDelegateDefer = async (
  client: Client,
  args: {
    heir: Address;
  },
): Promise<{ delegate: KeyPairSigner }> => {
  const [authority, delegate] = await Promise.all([loadDefaultKeypair(), generateKeyPairSigner()]);

  const [estate] = await findEstatePda({
    authority: authority.address,
    heir: args.heir,
  });

  const ix = await getDelegateDeferInstructionAsync({
    delegate,
    authority: authority.address,
    heir: args.heir,
    estate,
  });

  await sendInstruction(client, delegate, ix);
  return { delegate };
};

export const sendRegisterAsset = async (
  client: Client,
  args: {
    heir: Address;
    amount: bigint;
    mint?: Address;
    vaultTokenAccount?: Address;
    authorityTokenAccount?: Address;
    tokenProgram?: Address;
  },
): Promise<{ authority: Address }> => {
  const authority = await loadDefaultKeypair();

  const [vault, estate] = await Promise.all([
    findVaultPda({ authority: authority.address, heir: args.heir }),
    findEstatePda({ authority: authority.address, heir: args.heir }),
  ]);

  const assetRecord = args.mint ? await deriveAssetRecord(estate[0], args.mint) : undefined;

  const ix = await getRegisterAssetInstructionAsync({
    authority,
    heir: args.heir,
    amount: args.amount,
    mint: args.mint,
    vault: vault[0],
    estate: estate[0],
    vaultTokenAccount: args.vaultTokenAccount,
    tokenProgram: args.tokenProgram,
    authorityTokenAccount: args.authorityTokenAccount,
    assetRecord,
  });

  await sendInstruction(client, authority, ix);
  return { authority: authority.address };
};
