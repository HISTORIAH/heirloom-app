import path from "node:path";

import {
  appendTransactionMessageInstruction,
  createClient,
  createTransactionMessage,
  generateKeyPairSigner,
  getAddressEncoder,
  isSolanaError,
  lamports,
  partiallySignTransactionMessageWithSigners,
  pipe,
  setTransactionMessageFeePayerSigner,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
  type Address,
  type Instruction,
  type KeyPairSigner,
  type SolanaError,
} from "@solana/kit";
import { airdropSigner, generatedSigner } from "@solana/kit-plugin-signer";
import {
  getSolanaErrorFromLiteSvmFailure,
  isFailedTransaction,
  litesvm,
} from "@solana/kit-plugin-litesvm";
import { systemProgram } from "@solana-program/system";
import {
  ExtensionType,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getEnableCpiGuardInstruction,
  getReallocateInstruction,
  getThawAccountInstruction,
  token2022Program,
  TOKEN_2022_PROGRAM_ADDRESS,
  type ExtensionArgs,
} from "@solana-program/token-2022";
import { associatedTokenProgram, tokenProgram, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";

import {
  ADMIN_ADDRESS,
  getIssuerRegistryEncoder,
  HEIRLOOM_STOCKS_PROGRAM_ADDRESS,
  heirloomStocksProgram,
  findBackupPlanPda,
  findCoveredAssetPda,
  findIssuerPda,
  findVaultPlanPda,
  TREASURY_ADDRESS,
} from "../src/main";
import { getHeirloomStocksErrorMessage, type HeirloomStocksError } from "../src/generated/errors";

// `programs/heirloom-stocks/build.sh` copies the artifact here from the program's
// own workspace target dir.
const STOCKS_BINARY_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "target",
  "deploy",
  "heirloom_stocks.so",
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
      client.svm.addProgramFromFile(HEIRLOOM_STOCKS_PROGRAM_ADDRESS, STOCKS_BINARY_PATH);
      return client;
    })
    .use(heirloomStocksProgram())
    .use(systemProgram())
    .use(tokenProgram())
    .use(token2022Program())
    .use(associatedTokenProgram());
}

export type LiteSvmClient = Awaited<ReturnType<typeof createTestClient>>;

// ---------------------------------------------------------------------------
// General helpers
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

/** Ceiling-division fee, matching `calculate_distribution` on-chain. */
export function calculateFee(amount: bigint, basisPoints: bigint): bigint {
  return (amount * basisPoints + 9_999n) / 10_000n;
}

/** Floor-division allocation, matching `apply_allocation` on-chain. */
export function applyAllocation(balance: bigint, allocationBps: bigint): bigint {
  return (balance * allocationBps) / 10_000n;
}

export async function accountExists(client: LiteSvmClient, account: Address): Promise<boolean> {
  return (
    (await client.rpc.getAccountInfo(account, { commitment: "confirmed" }).send()).value !== null
  );
}

/**
 * Warp forward by N seconds (each slot = 350ms).
 *
 * litesvm's `warpToSlot` only bumps `clock.slot` — it does NOT advance
 * `clock.unixTimestamp`, which is what the program reads via
 * `Clock::get()?.unix_timestamp`. The blockhash also has to be expired, or two
 * transactions built from identical instructions before and after a warp hash the
 * same and the second is rejected as "already processed" rather than replayed
 * against the new clock.
 */
export function warpSeconds(client: LiteSvmClient, seconds: bigint) {
  const clock = client.svm.getClock();
  clock.slot += (seconds * 1000n) / 350n;
  clock.unixTimestamp += seconds;
  client.svm.setClock(clock);
  client.svm.expireBlockhash();
}

export function currentTimestamp(client: LiteSvmClient): bigint {
  return client.svm.getClock().unixTimestamp;
}

/**
 * Forces the next transaction to hash differently.
 *
 * Two transactions built from identical instructions against the same blockhash
 * are the same transaction, and litesvm rejects the second as already processed.
 */
export function expireBlockhash(client: LiteSvmClient) {
  client.svm.expireBlockhash();
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

/**
 * Anchor framework errors, raised while accounts are validated and before any
 * handler code runs, so they never appear in this program's own IDL.
 */
export const ANCHOR_ERROR__CONSTRAINT_DUPLICATE_MUTABLE_ACCOUNT = 2040;

const ANCHOR_ERROR_MESSAGES: Record<number, string> = {
  [ANCHOR_ERROR__CONSTRAINT_DUPLICATE_MUTABLE_ACCOUNT]: "Anchor: duplicate mutable account",
};

type ExpectedErrorCode =
  HeirloomStocksError | typeof ANCHOR_ERROR__CONSTRAINT_DUPLICATE_MUTABLE_ACCOUNT;

function describeErrorCode(code: number): string {
  const message =
    ANCHOR_ERROR_MESSAGES[code] ?? getHeirloomStocksErrorMessage(code as HeirloomStocksError);
  return `${message} (${code})`;
}

export function decodeStocksError(error: unknown): string {
  const customError = findCustomProgramError(error);
  if (!customError) throw error;
  return describeErrorCode(customError.context.code);
}

export async function expectStocksError(promise: Promise<unknown>, code: ExpectedErrorCode) {
  try {
    await promise;
  } catch (error) {
    const customError = findCustomProgramError(error);
    if (customError && customError.context.code === code) {
      return;
    }
    throw new Error(`Expected ${describeErrorCode(code)}, got: ${decodeStocksError(error)}`);
  }
  throw new Error(`Expected transaction to fail with ${describeErrorCode(code)}, but it succeeded`);
}

// ---------------------------------------------------------------------------
// Issuer registry
// ---------------------------------------------------------------------------

/**
 * Writes an `IssuerRegistry` straight into the SVM instead of calling
 * `register_issuer`.
 *
 * The instruction gates on a hardcoded `ADMIN` address whose keypair does not
 * exist in this repo, so tests that merely need a curated issuer to exist forge
 * the account. `issuer.test.ts` still exercises the real instruction's admin gate.
 */
export async function seedIssuer(
  client: LiteSvmClient,
  mintAuthority: Address,
  options: { label?: string; riskTier?: number; enabled?: boolean } = {},
): Promise<Address> {
  const { label = "test-issuer", riskTier = 1, enabled = true } = options;

  const [issuer] = await findIssuerPda({ mintAuthority });

  const labelBytes = new Uint8Array(16);
  labelBytes.set(new TextEncoder().encode(label).slice(0, 16));

  const data = getIssuerRegistryEncoder().encode({
    version: 1,
    mintAuthority,
    label: labelBytes,
    riskTier,
    enabled,
    bump: 0, // overwritten below with the real bump
  });

  // The stored bump must match the canonical one, since every instruction that
  // loads this account re-derives the PDA with `bump = issuer.bump`.
  const [, bump] = await findIssuerPda({ mintAuthority });
  // Copied through `ArrayLike`, which reads the same under every TypeScript
  // version this harness is compiled with (the stocks app's tests import it).
  const withBump = new Uint8Array(data as unknown as ArrayLike<number>);
  withBump[withBump.length - 1] = bump;

  client.svm.setAccount({
    address: issuer,
    data: withBump,
    executable: false,
    lamports: lamports(client.svm.minimumBalanceForRentExemption(BigInt(withBump.length))),
    programAddress: HEIRLOOM_STOCKS_PROGRAM_ADDRESS,
    space: BigInt(withBump.length),
  });

  return issuer;
}

/**
 * Sends `instruction` as though `ADMIN` had signed it.
 *
 * The admin keypair is not in this repo, so the instruction must carry
 * `createNoopSigner(ADMIN_ADDRESS)`, which marks the account as a signer but
 * produces no signature, and signature verification is switched off for this one
 * transaction. Everything the program itself checks — the `address = ADMIN`
 * constraint, PDA derivation, account ownership — still runs as it would
 * on-chain, and that is the part under test.
 */
export async function sendAsAdmin(client: LiteSvmClient, instruction: Instruction) {
  // The admin pays rent for new registry entries. Only an empty account is
  // funded: two admin sends in one blockhash would otherwise repeat an identical
  // airdrop, which is rejected as already processed.
  const { value: adminBalance } = await client.rpc.getBalance(ADMIN_ADDRESS).send();
  if (adminBalance === 0n) {
    await client.airdrop(ADMIN_ADDRESS, lamports(1_000_000_000n));
  }

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(client.payer, tx),
    (tx) => client.svm.setTransactionMessageLifetimeUsingLatestBlockhash(tx),
    (tx) => appendTransactionMessageInstruction(instruction, tx),
  );
  const transaction = await partiallySignTransactionMessageWithSigners(message);

  client.svm.withSigverify(false);
  try {
    const result = client.svm.sendTransaction(transaction);
    if (isFailedTransaction(result)) throw getSolanaErrorFromLiteSvmFailure(result);
  } finally {
    client.svm.withSigverify(true);
  }
}

// ---------------------------------------------------------------------------
// Mints
// ---------------------------------------------------------------------------

/**
 * Creates a Token-2022 mint and funds the owner's ATA with it.
 *
 * `extensions` lets a test reproduce the configurations real tokenized equities
 * ship with — a mint-level permanent delegate, a pausable config, an allocated
 * but unwired transfer hook, and so on.
 *
 * Pass `tokenProgram: TOKEN_PROGRAM_ADDRESS` for a classic SPL Token mint
 * instead, which cannot carry extensions.
 */
export async function createEquityMint(
  client: LiteSvmClient,
  input: {
    mintAuthority: KeyPairSigner;
    owner: Address;
    amount?: bigint;
    decimals?: number;
    extensions?: ExtensionArgs[];
    freezeAuthority?: Address;
    /**
     * Thaw the owner's ATA with this authority before minting.
     *
     * Required for `DefaultAccountState: frozen` mints, where a fresh ATA starts
     * frozen and minting into it fails — the same allowlisting an issuer performs
     * for a permitted holder.
     */
    thawWith?: KeyPairSigner;
    tokenProgram?: Address;
  },
) {
  const {
    mintAuthority,
    owner,
    amount = 1_000_000_000n, // 1000 tokens at 6dp
    decimals = 6,
    extensions,
    freezeAuthority,
    thawWith,
    tokenProgram = TOKEN_2022_PROGRAM_ADDRESS,
  } = input;

  const mint = await generateKeyPairSigner();

  if (tokenProgram === TOKEN_PROGRAM_ADDRESS) {
    if (extensions || thawWith) {
      throw new Error("classic SPL Token mints have no extensions to configure");
    }

    await client.token.instructions
      .createMint({
        newMint: mint,
        decimals,
        mintAuthority: mintAuthority.address,
        ...(freezeAuthority ? { freezeAuthority } : {}),
      })
      .sendTransaction();
    await client.token.instructions
      .mintToATA({ mint: mint.address, mintAuthority, amount, owner, decimals })
      .sendTransaction();

    const ownerAta = await ataFor(owner, mint.address, TOKEN_PROGRAM_ADDRESS);
    return { mint: mint.address, mintSigner: mint, ownerAta, decimals, amount, tokenProgram };
  }

  await client.token2022.instructions
    .createMint({
      newMint: mint,
      decimals,
      mintAuthority,
      ...(freezeAuthority ? { freezeAuthority } : {}),
      ...(extensions ? { extensions } : {}),
    })
    .sendTransaction();

  const [ownerAta] = await findAssociatedTokenPda({
    owner,
    mint: mint.address,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });

  if (thawWith) {
    await client.sendTransaction(
      await getCreateAssociatedTokenIdempotentInstructionAsync({
        payer: thawWith,
        owner,
        mint: mint.address,
        tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
      }),
    );
    await client.sendTransaction(
      getThawAccountInstruction(
        { account: ownerAta, mint: mint.address, owner: thawWith },
        { programAddress: TOKEN_2022_PROGRAM_ADDRESS },
      ),
    );
  }

  await client.token2022.instructions
    .mintToATA({ mint: mint.address, mintAuthority, amount, owner, decimals })
    .sendTransaction();

  return { mint: mint.address, mintSigner: mint, ownerAta, decimals, amount, tokenProgram };
}

/**
 * Creates a mint plus a curated issuer entry for its authority, which is the
 * precondition every `cover_asset` call has.
 */
export async function createCoveredEquity(
  client: LiteSvmClient,
  input: {
    owner: Address;
    mintAuthority?: KeyPairSigner;
    amount?: bigint;
    decimals?: number;
    extensions?: ExtensionArgs[];
    freezeAuthority?: Address;
    thawWith?: KeyPairSigner;
    issuerEnabled?: boolean;
    tokenProgram?: Address;
  },
) {
  const mintAuthority = input.mintAuthority ?? (await generateKeyPairSignerWithSol(client));
  const issuer = await seedIssuer(client, mintAuthority.address, {
    enabled: input.issuerEnabled ?? true,
  });
  const equity = await createEquityMint(client, { ...input, mintAuthority });

  return { ...equity, issuer, mintAuthority };
}

const EXTENSION_TYPE_PERMANENT_DELEGATE = 12;

/**
 * Grafts a `PermanentDelegate` extension onto a live mint.
 *
 * Token-2022 offers no legitimate path to this. `initialize_permanent_delegate`
 * rejects the default address, so a mint cannot start with an empty slot, and
 * `set_authority` for `PermanentDelegate` must be signed by the *current*
 * delegate, so an absent one can never be filled in. The program still guards
 * against a delegate appearing mid-plan — an issuer could ship a mint that gains
 * clawback power through some future mechanism — and writing the account is the
 * only way to exercise that guard.
 *
 * The mint must already carry at least one other extension, since that is what
 * puts it in the TLV layout this appends to.
 */
export async function forcePermanentDelegate(
  client: LiteSvmClient,
  mint: Address,
  delegate: Address,
) {
  const account = (await client.rpc.getAccountInfo(mint, { encoding: "base64" }).send()).value;
  if (!account) throw new Error(`mint ${mint} not found`);

  const existing = Uint8Array.from(Buffer.from(account.data[0], "base64"));

  // TLV entries start after the 83-byte-padded base mint plus its account-type
  // byte at 165. Walk to the first unwritten entry.
  let offset = 166;
  if (existing.length <= offset) {
    throw new Error("mint is not in the extended TLV layout — give it an extension first");
  }
  while (offset + 4 <= existing.length) {
    const type = existing[offset]! | (existing[offset + 1]! << 8);
    if (type === 0) break; // uninitialized tail
    if (type === EXTENSION_TYPE_PERMANENT_DELEGATE) {
      throw new Error("mint already has a PermanentDelegate extension");
    }
    offset += 4 + (existing[offset + 2]! | (existing[offset + 3]! << 8));
  }

  const entry = new Uint8Array(4 + 32);
  entry[0] = EXTENSION_TYPE_PERMANENT_DELEGATE;
  entry[2] = 32;
  entry.set(getAddressEncoder().encode(delegate) as unknown as ArrayLike<number>, 4);

  const data = new Uint8Array(Math.max(existing.length, offset + entry.length));
  data.set(existing);
  data.set(entry, offset);

  client.svm.setAccount({
    address: mint,
    data,
    executable: false,
    lamports: lamports(BigInt(account.lamports)),
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    space: BigInt(data.length),
  });
}

/**
 * Turns on CPI Guard for `tokenAccount`, which wallets offer as a safety toggle.
 *
 * The extension lives on the token account rather than the mint, so the account
 * has to be reallocated to make room for it first.
 */
export async function enableCpiGuard(
  client: LiteSvmClient,
  owner: KeyPairSigner,
  tokenAccount: Address,
) {
  await client.sendTransaction([
    getReallocateInstruction({
      token: tokenAccount,
      payer: owner,
      owner,
      newExtensionTypes: [ExtensionType.CpiGuard],
    }),
    getEnableCpiGuardInstruction({ token: tokenAccount, owner }),
  ]);
}

// ---------------------------------------------------------------------------
// PDA helpers
// ---------------------------------------------------------------------------

export async function deriveBackupPdas(owner: Address, mint?: Address) {
  const [plan] = await findBackupPlanPda({ owner });
  if (!mint) return { plan, coveredAsset: undefined };
  const [coveredAsset] = await findCoveredAssetPda({ plan, mint });
  return { plan, coveredAsset };
}

export async function deriveVaultPdas(owner: Address, mint?: Address) {
  const [plan] = await findVaultPlanPda({ owner });
  if (!mint) return { plan, coveredAsset: undefined, vaultAta: undefined };
  const [coveredAsset] = await findCoveredAssetPda({ plan, mint });
  const [vaultAta] = await findAssociatedTokenPda({
    owner: plan,
    mint,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });
  return { plan, coveredAsset, vaultAta };
}

export async function ataFor(
  owner: Address,
  mint: Address,
  tokenProgram: Address = TOKEN_2022_PROGRAM_ADDRESS,
) {
  const [ata] = await findAssociatedTokenPda({ owner, mint, tokenProgram });
  return ata;
}

// ---------------------------------------------------------------------------
// Instruction builders
// ---------------------------------------------------------------------------

export const DEFAULT_INTERVAL = 30n * 86_400n;
export const DEFAULT_GRACE = 7n * 86_400n;
export const DEFAULT_PAUSE = 3n * 86_400n;

export { MAX_INTERVAL_SECONDS } from "../src/constants";

export async function initBackupPlan(input: {
  client: LiteSvmClient;
  owner: KeyPairSigner;
  destination: Address;
  checkinIntervalSecs?: bigint;
  gracePeriodSecs?: bigint;
  pauseDurationSecs?: bigint;
  checkinSigner?: Address;
  guardian?: Address;
}) {
  const { client, owner, destination, checkinSigner, guardian } = input;

  const ix = await client.heirloomStocks.instructions.initializeBackupPlan({
    owner,
    destination,
    checkinSigner,
    guardian,
    checkinIntervalSecs: input.checkinIntervalSecs ?? DEFAULT_INTERVAL,
    gracePeriodSecs: input.gracePeriodSecs ?? DEFAULT_GRACE,
    pauseDurationSecs: input.pauseDurationSecs ?? DEFAULT_PAUSE,
  });

  const { plan } = await deriveBackupPdas(owner.address);
  return { ix, plan };
}

export async function initVaultPlan(input: {
  client: LiteSvmClient;
  owner: KeyPairSigner;
  destination: Address;
  checkinIntervalSecs?: bigint;
  gracePeriodSecs?: bigint;
  pauseDurationSecs?: bigint;
  checkinSigner?: Address;
  guardian?: Address;
}) {
  const { client, owner, destination, checkinSigner, guardian } = input;

  const ix = await client.heirloomStocks.instructions.initializeVaultPlan({
    owner,
    destination,
    checkinSigner,
    guardian,
    checkinIntervalSecs: input.checkinIntervalSecs ?? DEFAULT_INTERVAL,
    gracePeriodSecs: input.gracePeriodSecs ?? DEFAULT_GRACE,
    pauseDurationSecs: input.pauseDurationSecs ?? DEFAULT_PAUSE,
  });

  const { plan } = await deriveVaultPdas(owner.address);
  return { ix, plan };
}

export async function coverAsset(input: {
  client: LiteSvmClient;
  owner: KeyPairSigner;
  mint: Address;
  ownerTokenAccount: Address;
  issuer: Address;
  allocationBps?: number;
  plan?: Address;
  tokenProgram?: Address;
}) {
  const {
    client,
    owner,
    mint,
    ownerTokenAccount,
    issuer,
    allocationBps = 10_000,
    tokenProgram = TOKEN_2022_PROGRAM_ADDRESS,
  } = input;

  // The record PDA is seeded by whichever plan is actually passed, so tests that
  // deliberately supply the wrong plan still reach the handler's mode check
  // instead of tripping a seeds constraint first.
  const [backupPlan] = await findBackupPlanPda({ owner: owner.address });
  const plan = input.plan ?? backupPlan;
  const [coveredAsset] = await findCoveredAssetPda({ plan, mint });

  const ix = await client.heirloomStocks.instructions.coverAsset({
    owner,
    mint,
    ownerTokenAccount,
    plan,
    issuer,
    coveredAsset,
    tokenProgram,
    allocationBps,
  });

  return { ix, plan, coveredAsset };
}

export async function uncoverAsset(input: {
  client: LiteSvmClient;
  owner: KeyPairSigner;
  mint: Address;
  /** `null` once the owner has closed the account. */
  ownerTokenAccount: Address | null;
}) {
  const { client, owner, mint, ownerTokenAccount } = input;
  const { plan, coveredAsset } = await deriveBackupPdas(owner.address, mint);

  // No mint account: uncovering issues a plain `revoke`, which doesn't take one.
  const ix = await client.heirloomStocks.instructions.uncoverAsset({
    owner,
    ownerTokenAccount: ownerTokenAccount ?? undefined,
    plan,
    coveredAsset: coveredAsset!,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });

  return { ix, plan, coveredAsset: coveredAsset! };
}

export async function recover(input: {
  client: LiteSvmClient;
  owner: Address;
  destination: KeyPairSigner;
  mint: Address;
  ownerTokenAccount: Address;
  tokenProgram?: Address;
}) {
  const {
    client,
    owner,
    destination,
    mint,
    ownerTokenAccount,
    tokenProgram = TOKEN_2022_PROGRAM_ADDRESS,
  } = input;
  const { plan, coveredAsset } = await deriveBackupPdas(owner, mint);

  const [destinationTokenAccount, treasuryTokenAccount] = await Promise.all([
    ataFor(destination.address, mint, tokenProgram),
    ataFor(TREASURY_ADDRESS, mint, tokenProgram),
  ]);

  const ix = await client.heirloomStocks.instructions.recover({
    destination,
    mint,
    ownerTokenAccount,
    destinationTokenAccount,
    treasury: TREASURY_ADDRESS,
    treasuryTokenAccount,
    plan,
    coveredAsset: coveredAsset!,
    tokenProgram,
  });

  return { ix, plan, coveredAsset: coveredAsset!, destinationTokenAccount, treasuryTokenAccount };
}

export async function checkIn(input: {
  client: LiteSvmClient;
  owner: Address;
  signer: KeyPairSigner;
  mode?: "backup" | "vault";
}) {
  const { client, owner, signer, mode = "backup" } = input;
  const { plan } = mode === "backup" ? await deriveBackupPdas(owner) : await deriveVaultPdas(owner);

  const ix = await client.heirloomStocks.instructions.checkIn({ signer, plan });
  return { ix, plan };
}

export async function guardianDefer(input: {
  client: LiteSvmClient;
  owner: Address;
  guardian: KeyPairSigner;
  mode?: "backup" | "vault";
}) {
  const { client, owner, guardian, mode = "backup" } = input;
  const { plan } = mode === "backup" ? await deriveBackupPdas(owner) : await deriveVaultPdas(owner);

  const ix = await client.heirloomStocks.instructions.guardianDefer({ guardian, plan });
  return { ix, plan };
}

export async function closePlan(input: {
  client: LiteSvmClient;
  owner: KeyPairSigner;
  mode?: "backup" | "vault";
}) {
  const { client, owner, mode = "backup" } = input;
  const { plan } =
    mode === "backup"
      ? await deriveBackupPdas(owner.address)
      : await deriveVaultPdas(owner.address);

  const ix = await client.heirloomStocks.instructions.closePlan({ owner, plan });
  return { ix, plan };
}

// ---------------------------------------------------------------------------
// Vault mode
// ---------------------------------------------------------------------------

export async function vaultAddAsset(input: {
  client: LiteSvmClient;
  owner: KeyPairSigner;
  mint: Address;
  ownerTokenAccount: Address;
  issuer: Address;
  amount: bigint;
}) {
  const { client, owner, mint, ownerTokenAccount, issuer, amount } = input;
  const { plan, coveredAsset, vaultAta } = await deriveVaultPdas(owner.address, mint);

  const ix = await client.heirloomStocks.instructions.vaultAddAsset({
    owner,
    mint,
    ownerTokenAccount,
    vaultTokenAccount: vaultAta!,
    plan,
    issuer,
    coveredAsset: coveredAsset!,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    amount,
  });

  return { ix, plan, coveredAsset: coveredAsset!, vaultAta: vaultAta! };
}

export async function vaultDeposit(input: {
  client: LiteSvmClient;
  owner: KeyPairSigner;
  mint: Address;
  ownerTokenAccount: Address;
  amount: bigint;
}) {
  const { client, owner, mint, ownerTokenAccount, amount } = input;
  const { plan, coveredAsset, vaultAta } = await deriveVaultPdas(owner.address, mint);

  const ix = await client.heirloomStocks.instructions.vaultDeposit({
    owner,
    mint,
    ownerTokenAccount,
    vaultTokenAccount: vaultAta!,
    plan,
    coveredAsset: coveredAsset!,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    amount,
  });

  return { ix, plan, coveredAsset: coveredAsset!, vaultAta: vaultAta! };
}

export async function vaultWithdraw(input: {
  client: LiteSvmClient;
  owner: KeyPairSigner;
  mint: Address;
  ownerTokenAccount: Address;
  amount: bigint;
}) {
  const { client, owner, mint, ownerTokenAccount, amount } = input;
  const { plan, coveredAsset, vaultAta } = await deriveVaultPdas(owner.address, mint);
  const treasuryTokenAccount = await ataFor(TREASURY_ADDRESS, mint);

  const ix = await client.heirloomStocks.instructions.vaultWithdraw({
    owner,
    mint,
    ownerTokenAccount,
    vaultTokenAccount: vaultAta!,
    treasury: TREASURY_ADDRESS,
    treasuryTokenAccount,
    plan,
    coveredAsset: coveredAsset!,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    amount,
  });

  return { ix, plan, coveredAsset: coveredAsset!, vaultAta: vaultAta!, treasuryTokenAccount };
}

export async function vaultClaim(input: {
  client: LiteSvmClient;
  owner: Address;
  destination: KeyPairSigner;
  mint: Address;
}) {
  const { client, owner, destination, mint } = input;
  const { plan, coveredAsset, vaultAta } = await deriveVaultPdas(owner, mint);

  const [destinationTokenAccount, treasuryTokenAccount] = await Promise.all([
    ataFor(destination.address, mint),
    ataFor(TREASURY_ADDRESS, mint),
  ]);

  const ix = await client.heirloomStocks.instructions.vaultClaim({
    destination,
    mint,
    vaultTokenAccount: vaultAta!,
    destinationTokenAccount,
    treasury: TREASURY_ADDRESS,
    treasuryTokenAccount,
    plan,
    coveredAsset: coveredAsset!,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });

  return {
    ix,
    plan,
    coveredAsset: coveredAsset!,
    vaultAta: vaultAta!,
    destinationTokenAccount,
    treasuryTokenAccount,
  };
}
