import path from "node:path";

import {
  createClient,
  generateKeyPairSigner,
  isSolanaError,
  lamports,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
  type Address,
  type KeyPairSigner,
  type SolanaError,
} from "@solana/kit";
import { airdropSigner, generatedSigner } from "@solana/kit-plugin-signer";
import { litesvm } from "@solana/kit-plugin-litesvm";
import { systemProgram } from "@solana-program/system";
import {
  findAssociatedTokenPda,
  token2022Program,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import { associatedTokenProgram } from "@solana-program/token";

import {
  findEstatePda,
  findVaultPda,
  HEIRLOOM_PROGRAM_ADDRESS,
  heirloomProgram,
} from "../src/generated";
import { getHeirloomErrorMessage, type HeirloomError } from "../src/generated/errors";
import { findAssetRecordPda, TREASURY_ADDRESS } from "../src/main";

const HEIRLOOM_BINARY_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "target",
  "deploy",
  "heirloom.so",
);

// ---------------------------------------------------------------------------
// Client setup
// ---------------------------------------------------------------------------

export async function createTestClient() {
  return createClient()
    .use(generatedSigner())
    .use(litesvm())
    .use(airdropSigner(lamports(1000_000_000_000n))) // 1000 SOL
    .use((client) => {
      // Must run after the `litesvm()` plugin so `client.svm` is available.
      client.svm.addProgramFromFile(HEIRLOOM_PROGRAM_ADDRESS, HEIRLOOM_BINARY_PATH);
      return client;
    })
    .use(heirloomProgram())
    .use(systemProgram())
    .use(token2022Program())
    .use(associatedTokenProgram());
}

export type LiteSvmClient = Awaited<ReturnType<typeof createTestClient>>;

// ---------------------------------------------------------------------------
// General test helpers
// ---------------------------------------------------------------------------

export const generateKeyPairSignerWithSol = async (
  client: LiteSvmClient,
  putativeLamports: bigint = 1_000_000_000_000n, // 1000 SOL
) => {
  const signer = await generateKeyPairSigner();
  await client.airdrop(signer.address, lamports(putativeLamports));
  return signer;
};

export async function fundTreasury(client: LiteSvmClient) {
  await client.airdrop(TREASURY_ADDRESS, lamports(1_000_000_000n));
}

export function calculateFee(amount: bigint, basisPoints: bigint): bigint {
  return (amount * basisPoints + 9_999n) / 10_000n;
}

export async function accountExists(client: LiteSvmClient, account: Address): Promise<boolean> {
  return (
    (await client.rpc.getAccountInfo(account, { commitment: "confirmed" }).send()).value !== null
  );
}

export async function createAndMintTokens(
  client: LiteSvmClient,
  authority: KeyPairSigner,
  tokenProgram: Address = TOKEN_2022_PROGRAM_ADDRESS,
) {
  const mint = await generateKeyPairSigner();
  const [authorityAta] = await findAssociatedTokenPda({
    owner: authority.address,
    tokenProgram,
    mint: mint.address,
  });

  // create token
  await client.token2022.instructions
    .createMint({ newMint: mint, decimals: 6, mintAuthority: authority })
    .sendTransaction();

  await client.token2022.instructions
    .mintToATA({
      mint: mint.address,
      mintAuthority: authority,
      amount: 1_000_000_000, // 1000 tokens
      owner: authority.address,
      decimals: 6,
    })
    .sendTransaction();

  return { mint: mint.address, authorityAta };
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

// client.sendTransaction() rejects with an outer SOLANA_ERROR__FAILED_TO_SEND_TRANSACTION
// whose `.cause` holds the actual SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM — walk the
// cause chain to find it instead of only checking the top-level error.
function findCustomProgramError(
  error: unknown,
): SolanaError<typeof SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM> | undefined {
  if (isSolanaError(error, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM)) {
    return error;
  }
  if (error instanceof Error && error.cause) {
    return findCustomProgramError(error.cause);
  }
  return undefined;
}

export function decodeHeirloomError(error: unknown): string {
  const customError = findCustomProgramError(error);
  if (!customError) throw error;
  const code = customError.context.code as HeirloomError;
  return `${getHeirloomErrorMessage(code)} (${code})`;
}

export async function expectHeirloomError(promise: Promise<unknown>, code: HeirloomError) {
  try {
    await promise;
  } catch (error) {
    const customError = findCustomProgramError(error);
    if (customError && customError.context.code === code) {
      return;
    }
    throw new Error(
      `Expected ${getHeirloomErrorMessage(code)} (${code}), got: ${decodeHeirloomError(error)}`,
    );
  }
  throw new Error(
    `Expected transaction to fail with ${getHeirloomErrorMessage(code)} (${code}), but it succeeded`,
  );
}

// ---------------------------------------------------------------------------
// PDA helpers
// ---------------------------------------------------------------------------

export async function deriveEstateVaultPDAs(input: { authority: Address; heir: Address }) {
  const { authority, heir } = input;

  const [[estate], [vault]] = await Promise.all([
    findEstatePda({ authority, heir }),
    findVaultPda({ authority, heir }),
  ]);

  return { estate, vault };
}

export async function deriveTokenAccounts(
  vault: Address,
  authority: Address,
  heir: Address,
  mint: Address,
  tokenProgram: Address = TOKEN_2022_PROGRAM_ADDRESS,
) {
  const [[vaultTokenAccount], [authorityTokenAccount], [heirTokenAccount], [treasuryTokenAccount]] =
    await Promise.all([
      findAssociatedTokenPda({ owner: vault, mint, tokenProgram }),
      findAssociatedTokenPda({ owner: authority, mint, tokenProgram }),
      findAssociatedTokenPda({ owner: heir, mint, tokenProgram }),
      findAssociatedTokenPda({ owner: TREASURY_ADDRESS, mint, tokenProgram }),
    ]);
  return { vaultTokenAccount, authorityTokenAccount, heirTokenAccount, treasuryTokenAccount };
}

// ---------------------------------------------------------------------------
// Heirloom program instruction builders
// ---------------------------------------------------------------------------

export async function genInitSolEstateIx(input: {
  client: LiteSvmClient;
  authority: KeyPairSigner;
  heir: KeyPairSigner;
  amount: bigint;
  heartbeatInterval?: bigint;
  gracePeriod?: bigint;
  pauseDuration?: bigint;
  hbSigner?: Address;
  delegate?: Address;
}) {
  let {
    client,
    authority,
    heir,
    amount,
    heartbeatInterval,
    gracePeriod,
    pauseDuration,
    hbSigner,
    delegate,
  } = input;

  const { estate, vault } = await deriveEstateVaultPDAs({
    authority: authority.address,
    heir: heir.address,
  });

  let ix = await client.heirloom.instructions.initialize({
    authority: authority,
    heir: heir.address,
    delegate,
    heartbeatInterval: heartbeatInterval ?? 0,
    gracePeriod: gracePeriod ?? 0,
    pauseDuration: pauseDuration ?? 0,
    hbSigner,
    amount,
    label: "test-sol",
  });

  return { ix, estate, vault };
}

export async function genInitTokenEstateIx(input: {
  client: LiteSvmClient;
  authority: KeyPairSigner;
  heir: Address;
  mint: Address;
  amount: bigint;
  tokenProgram: Address;
}) {
  let { client, authority, heir, amount, tokenProgram, mint } = input;

  const { vault, estate } = await deriveEstateVaultPDAs({ authority: authority.address, heir });
  const [assetRecord] = await findAssetRecordPda({ estate, mint });
  const [[vaultTokenAccount], [authorityTokenAccount]] = await Promise.all([
    findAssociatedTokenPda({ owner: vault, mint, tokenProgram }),
    findAssociatedTokenPda({ owner: authority.address, mint, tokenProgram }),
  ]);

  let ix = await client.heirloom.instructions.initialize({
    authority: authority,
    heir: heir,
    tokenProgram,
    mint,
    vaultTokenAccount,
    authorityTokenAccount,
    assetRecord,
    heartbeatInterval: 0,
    gracePeriod: 0,
    pauseDuration: 0,
    amount,
    label: "test-tokens",
  });

  return { ix, estate, vault, assetRecord, vaultTokenAccount, authorityTokenAccount };
}

export async function genRegisterAssetIx(input: {
  client: LiteSvmClient;
  authority: KeyPairSigner;
  heir: Address;
  amount: bigint;
  mint?: Address;
  tokenProgram?: Address;
}) {
  const { client, authority, heir, amount, mint, tokenProgram } = input;
  const { estate, vault } = await deriveEstateVaultPDAs({ authority: authority.address, heir });

  let assetRecord: Address | undefined;
  let vaultTokenAccount: Address | undefined;
  let authorityTokenAccount: Address | undefined;
  if (mint) {
    [assetRecord] = await findAssetRecordPda({ estate, mint });
    ({ vaultTokenAccount, authorityTokenAccount } = await deriveTokenAccounts(
      vault,
      authority.address,
      heir,
      mint,
      tokenProgram,
    ));
  }

  const ix = await client.heirloom.instructions.registerAsset({
    authority,
    heir,
    amount,
    mint,
    tokenProgram,
    vaultTokenAccount,
    authorityTokenAccount,
    assetRecord,
  });

  return { ix, estate, vault, assetRecord, vaultTokenAccount, authorityTokenAccount };
}

export async function genRevokeIx(input: {
  client: LiteSvmClient;
  authority: KeyPairSigner;
  heir: Address;
  mint?: Address;
  tokenProgram?: Address;
}) {
  const { client, authority, heir, mint, tokenProgram } = input;
  const { estate, vault } = await deriveEstateVaultPDAs({ authority: authority.address, heir });

  let assetRecord: Address | undefined;
  let vaultTokenAccount: Address | undefined;
  let authorityTokenAccount: Address | undefined;
  let treasuryTokenAccount: Address | undefined;
  if (mint) {
    [assetRecord] = await findAssetRecordPda({ estate, mint });
    ({ vaultTokenAccount, authorityTokenAccount, treasuryTokenAccount } = await deriveTokenAccounts(
      vault,
      authority.address,
      heir,
      mint,
      tokenProgram,
    ));
  }

  const ix = await client.heirloom.instructions.revoke({
    authority,
    heir,
    mint,
    tokenProgram,
    vaultTokenAccount,
    authorityTokenAccount,
    treasuryTokenAccount,
    assetRecord,
  });

  return {
    ix,
    estate,
    vault,
    assetRecord,
    vaultTokenAccount,
    authorityTokenAccount,
    treasuryTokenAccount,
  };
}

export async function genClaimIx(input: {
  client: LiteSvmClient;
  authority: Address;
  heir: KeyPairSigner;
  mint?: Address;
  tokenProgram?: Address;
}) {
  const { client, authority, heir, mint, tokenProgram } = input;
  const { estate, vault } = await deriveEstateVaultPDAs({ authority, heir: heir.address });

  let assetRecord: Address | undefined;
  let vaultTokenAccount: Address | undefined;
  let heirTokenAccount: Address | undefined;
  let treasuryTokenAccount: Address | undefined;
  if (mint) {
    [assetRecord] = await findAssetRecordPda({ estate, mint });
    ({ vaultTokenAccount, heirTokenAccount, treasuryTokenAccount } = await deriveTokenAccounts(
      vault,
      authority,
      heir.address,
      mint,
      tokenProgram,
    ));
  }

  const ix = await client.heirloom.instructions.claim({
    heir,
    authority,
    mint,
    tokenProgram,
    vaultTokenAccount,
    heirTokenAccount,
    treasuryTokenAccount,
    assetRecord,
  });

  return {
    ix,
    estate,
    vault,
    assetRecord,
    vaultTokenAccount,
    heirTokenAccount,
    treasuryTokenAccount,
  };
}

export async function genUpdateHeirIx(input: {
  client: LiteSvmClient;
  authority: KeyPairSigner;
  oldHeir: Address;
  newHeir: Address;
  mint?: Address;
  tokenProgram?: Address;
}) {
  const { client, authority, oldHeir, newHeir, mint, tokenProgram } = input;
  const [{ estate, vault }, { estate: newEstate, vault: newVault }] = await Promise.all([
    deriveEstateVaultPDAs({ authority: authority.address, heir: oldHeir }),
    deriveEstateVaultPDAs({ authority: authority.address, heir: newHeir }),
  ]);

  let assetRecord: Address | undefined;
  let newAssetRecord: Address | undefined;
  let vaultTokenAccount: Address | undefined;
  let newVaultTokenAccount: Address | undefined;
  if (mint) {
    [[assetRecord], [newAssetRecord]] = await Promise.all([
      findAssetRecordPda({ estate, mint }),
      findAssetRecordPda({ estate: newEstate, mint }),
    ]);
    [{ vaultTokenAccount }, { vaultTokenAccount: newVaultTokenAccount }] = await Promise.all([
      deriveTokenAccounts(vault, authority.address, oldHeir, mint, tokenProgram),
      deriveTokenAccounts(newVault, authority.address, newHeir, mint, tokenProgram),
    ]);
  }

  const ix = await client.heirloom.instructions.updateHeir({
    authority,
    heir: oldHeir,
    newHeir,
    estate,
    vault,
    newEstate,
    newVault,
    mint,
    tokenProgram,
    assetRecord,
    newAssetRecord,
    vaultTokenAccount,
    newVaultTokenAccount,
  });

  return {
    ix,
    estate,
    vault,
    newEstate,
    newVault,
    assetRecord,
    newAssetRecord,
    vaultTokenAccount,
    newVaultTokenAccount,
  };
}

export async function genUpdateFieldsIx(input: {
  client: LiteSvmClient;
  authority: KeyPairSigner;
  heir: Address;
  signer?: KeyPairSigner;
  heartbeatInterval?: bigint;
  gracePeriod?: bigint;
  pauseDuration?: bigint;
  label?: string;
}) {
  const { client, authority, heir, heartbeatInterval, gracePeriod, pauseDuration, label } = input;
  const signer = input.signer ?? authority;

  const [estate] = await findEstatePda({ authority: authority.address, heir });

  const ix = client.heirloom.instructions.updateField({
    authority: signer,
    heir,
    estate,
    heartbeatInterval: heartbeatInterval ?? null,
    gracePeriod: gracePeriod ?? null,
    pauseDuration: pauseDuration ?? null,
    label: label ?? null,
  });

  return { ix, estate };
}

export async function genDelegateDeferIx(input: {
  client: LiteSvmClient;
  delegate: KeyPairSigner;
  authority: Address;
  heir: Address;
}) {
  const { client, delegate, authority, heir } = input;

  const [estate] = await findEstatePda({ authority, heir });

  const ix = await client.heirloom.instructions.delegateDefer({
    delegate,
    authority,
    heir,
    estate,
  });

  return { ix, estate };
}
