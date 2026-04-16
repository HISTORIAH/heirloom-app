import {
  appendTransactionMessageInstruction,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase58Decoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  type Address,
  type MaybeAccount,
  type TransactionSigner,
} from "@solana/kit";
import {
  decodeEstate,
  fetchMaybeEstate,
  findEstatePda,
  HEIRLOOM_PROGRAM_PROGRAM_ADDRESS,
  type Estate,
  findVaultPda,
  getClaimInstructionAsync,
  getCloseEstateInstructionAsync,
  getDelegateDeferInstructionAsync,
  getInitializeInstructionAsync,
  getRegisterAssetInstructionAsync,
  getRevokeInstructionAsync,
  getUpdateFieldsInstructionAsync,
  type Estate,
} from "@historiah/heirloom";
import { getCreateAccountInstruction } from "@solana-program/system";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import type { AppRpc, AppRpcSubscriptions } from "@/contexts/WalletContext";

export type Client = {
  rpc: AppRpc;
  rpcSubscriptions: AppRpcSubscriptions;
};

export type EstateAccount = MaybeAccount<Estate>;

const base58 = getBase58Decoder();

// Size of a standard SPL Token account (165 bytes).
const TOKEN_ACCOUNT_SIZE = 165n;

type Ix = Parameters<typeof appendTransactionMessageInstruction>[0];

async function sendTx(
  client: Client,
  feePayer: TransactionSigner,
  ix: Ix | Ix[],
): Promise<string> {
  const ixs = Array.isArray(ix) ? ix : [ix];
  const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let message: any = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  );
  for (const instruction of ixs) {
    message = appendTransactionMessageInstruction(instruction, message);
  }

  const signatureBytes = await signAndSendTransactionMessageWithSigners(message);
  return base58.decode(signatureBytes);
}

// ---------------------------------------------------------------------------
// PDA helpers
// ---------------------------------------------------------------------------

export async function getEstateAddress(
  authority: Address,
  heir: Address,
): Promise<Address> {
  const [pda] = await findEstatePda({ authority, heir });
  return pda;
}

export async function getVaultAddress(
  authority: Address,
  heir: Address,
): Promise<Address> {
  const [pda] = await findVaultPda({ authority, heir });
  return pda;
}

export async function getAtaAddress(
  owner: Address,
  mint: Address,
  tokenProgram: Address = TOKEN_PROGRAM_ADDRESS,
): Promise<Address> {
  const [ata] = await findAssociatedTokenPda({ owner, mint, tokenProgram });
  return ata;
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

export async function fetchEstateByPair(
  rpc: AppRpc,
  authority: Address,
  heir: Address,
): Promise<EstateAccount> {
  const pda = await getEstateAddress(authority, heir);
  return fetchMaybeEstate(rpc, pda);
}

/**
 * Fetch all Estate accounts where the given address is the authority,
 * directly from the chain using getProgramAccounts with memcmp filters.
 *
 * Estate layout: discriminator(1) | authority(32) | heir(32) | ...
 * Filter: discriminator == 1 (estate) AND authority == wallet address.
 */
export async function fetchEstatesByAuthority(
  rpc: AppRpc,
  authority: Address,
): Promise<Array<{ address: Address; data: Estate }>> {
  const accounts = await rpc
    .getProgramAccounts(HEIRLOOM_PROGRAM_PROGRAM_ADDRESS, {
      encoding: "base64",
      filters: [
        // Estate discriminator = [1] → base64 "AQ=="
        { memcmp: { offset: 0n, bytes: "AQ==", encoding: "base64" } },
        // Authority at offset 1 (base58 address)
        { memcmp: { offset: 1n, bytes: authority, encoding: "base58" } },
      ],
    })
    .send();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return accounts.map((item: any) => {
    const b64: string = Array.isArray(item.account.data)
      ? item.account.data[0]
      : item.account.data;
    const binary = atob(b64);
    const raw = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) raw[i] = binary.charCodeAt(i);

    const decoded = decodeEstate({
      address: item.pubkey,
      data: raw,
      executable: item.account.executable,
      lamports: item.account.lamports,
      programAddress: HEIRLOOM_PROGRAM_PROGRAM_ADDRESS,
      exists: true,
    });
    return { address: item.pubkey as Address, data: decoded.data };
  });
}

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

export interface InitializeArgs {
  authority: TransactionSigner;
  heir: Address;
  amount: bigint;
  label: string;
  heartbeatInterval: bigint;
  gracePeriod: bigint;
  pauseDuration: bigint;
  delegate?: Address;
  mint?: Address;
  tokenProgram?: Address;
  authorityTokenAccount?: Address;
  vaultTokenAccount?: Address;
}

export async function sendInitialize(
  client: Client,
  args: InitializeArgs,
): Promise<string> {
  const ix = await getInitializeInstructionAsync({
    authority: args.authority,
    heir: args.heir,
    delegate: args.delegate,
    authorityTokenAccount: args.authorityTokenAccount,
    vaultTokenAccount: args.vaultTokenAccount,
    mint: args.mint,
    tokenProgram: args.tokenProgram,
    heartbeatInterval: args.heartbeatInterval,
    gracePeriod: args.gracePeriod,
    pauseDuration: args.pauseDuration,
    amount: args.amount,
    label: args.label,
  });
  return sendTx(client, args.authority, ix);
}

export interface UpdateArgs {
  authority: TransactionSigner;
  heir: Address;
}

export async function sendUpdate(
  client: Client,
  args: UpdateArgs,
): Promise<string> {
  // updateFields with all None → heartbeat-only (program sets last_heartbeat = now).
  const ix = await getUpdateFieldsInstructionAsync({
    authority: args.authority,
    heir: args.heir,
    heartbeatInterval: null,
    gracePeriod: null,
    pauseDuration: null,
  });
  return sendTx(client, args.authority, ix);
}

export interface RevokeArgs {
  authority: TransactionSigner;
  heir: Address;
  mint?: Address;
  tokenProgram?: Address;
  authorityTokenAccount?: Address;
  vaultTokenAccount?: Address;
}

export async function sendRevoke(
  client: Client,
  args: RevokeArgs,
): Promise<string> {
  const ixs: Ix[] = [];

  // For token revokes, create authority ATA idempotently so tokens have a destination
  if (args.mint && args.authorityTokenAccount) {
    const tokenProgram = args.tokenProgram ?? TOKEN_PROGRAM_ADDRESS;
    const createAtaIx = await getCreateAssociatedTokenIdempotentInstructionAsync({
      payer: args.authority,
      owner: args.authority.address,
      mint: args.mint,
      tokenProgram,
    });
    ixs.push(createAtaIx);
  }

  const revokeIx = await getRevokeInstructionAsync({
    authority: args.authority,
    heir: args.heir,
    mint: args.mint,
    tokenProgram: args.tokenProgram,
    authorityTokenAccount: args.authorityTokenAccount,
    vaultTokenAccount: args.vaultTokenAccount,
  });
  ixs.push(revokeIx);

  return sendTx(client, args.authority, ixs);
}

export interface ClaimArgs {
  heir: TransactionSigner;
  authority: Address;
  mint?: Address;
  tokenProgram?: Address;
  vaultTokenAccount?: Address;
  heirTokenAccount?: Address;
  delegate?: Address;
}

export async function sendClaim(
  client: Client,
  args: ClaimArgs,
): Promise<string> {
  const ixs: Ix[] = [];

  // For token claims, create the heir ATA idempotently before claiming
  if (args.mint && args.heirTokenAccount) {
    const tokenProgram = args.tokenProgram ?? TOKEN_PROGRAM_ADDRESS;
    const createAtaIx = await getCreateAssociatedTokenIdempotentInstructionAsync({
      payer: args.heir,
      owner: args.heir.address,
      mint: args.mint,
      tokenProgram,
    });
    ixs.push(createAtaIx);
  }

  const claimIx = await getClaimInstructionAsync({
    heir: args.heir,
    authority: args.authority,
    mint: args.mint,
    tokenProgram: args.tokenProgram,
    vaultTokenAccount: args.vaultTokenAccount,
    heirTokenAccount: args.heirTokenAccount,
    delegate: args.delegate,
  });
  ixs.push(claimIx);

  return sendTx(client, args.heir, ixs);
}

export interface DelegateDeferArgs {
  delegate: TransactionSigner;
  authority: Address;
  heir: Address;
}

export async function sendDelegateDefer(
  client: Client,
  args: DelegateDeferArgs,
): Promise<string> {
  const ix = await getDelegateDeferInstructionAsync({
    delegate: args.delegate,
    authority: args.authority,
    heir: args.heir,
  });
  return sendTx(client, args.delegate, ix);
}

// ---------------------------------------------------------------------------
// Close Estate — reclaim rent from a stale/empty estate
// ---------------------------------------------------------------------------

export interface CloseEstateArgs {
  authority: TransactionSigner;
  heir: Address;
}

export async function sendCloseEstate(
  client: Client,
  args: CloseEstateArgs,
): Promise<string> {
  const ix = await getCloseEstateInstructionAsync({
    authority: args.authority,
    heir: args.heir,
  });
  return sendTx(client, args.authority, ix);
}

// ---------------------------------------------------------------------------
// Register Asset + Deposit — adds a token type to an existing estate
// ---------------------------------------------------------------------------

export interface RegisterAndDepositArgs {
  authority: TransactionSigner;
  heir: Address;
  mint: Address;
  amount: bigint;
  decimals: number;
  tokenProgram?: Address;
}

/**
 * Registers a new token asset on an existing estate and deposits tokens.
 * Bundles three instructions in one transaction:
 *   1. system_program.create_account — allocate vault TA
 *   2. heirloom.register_asset — init vault TA + increment claimable_assets
 *   3. spl_token.transfer_checked — move tokens from authority ATA to vault TA
 */
export async function sendRegisterAndDeposit(
  client: Client,
  args: RegisterAndDepositArgs,
): Promise<string> {
  const tokenProgram = args.tokenProgram ?? TOKEN_PROGRAM_ADDRESS;

  // 1. Rent-exempt lamports for a token account
  const rentLamports = await client.rpc
    .getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE)
    .send();

  // 2. Generate a new keypair for the vault token account
  const vaultTaKeypair = await generateKeyPairSigner();

  // 3. Build create_account instruction
  const createAccountIx = getCreateAccountInstruction({
    payer: args.authority,
    newAccount: vaultTaKeypair,
    lamports: rentLamports,
    space: TOKEN_ACCOUNT_SIZE,
    programAddress: tokenProgram,
  });

  // 4. Build registerAsset instruction
  const registerIx = await getRegisterAssetInstructionAsync({
    authority: args.authority,
    heir: args.heir,
    mint: args.mint,
    vaultTokenAccount: vaultTaKeypair.address,
    tokenProgram,
  });

  // 5. Build transfer_checked instruction
  const authorityAta = await getAtaAddress(
    args.authority.address,
    args.mint,
    tokenProgram,
  );
  const transferIx = getTransferCheckedInstruction({
    source: authorityAta,
    mint: args.mint,
    destination: vaultTaKeypair.address,
    authority: args.authority,
    amount: args.amount,
    decimals: args.decimals,
  });

  return sendTx(client, args.authority, [createAccountIx, registerIx, transferIx]);
}

// ---------------------------------------------------------------------------
// Discover vault token accounts (for claim flow)
// ---------------------------------------------------------------------------

export interface VaultTokenInfo {
  mint: string;
  address: string;
  amount: bigint;
  decimals: number;
}

export async function discoverVaultTokenAccounts(
  rpc: AppRpc,
  vaultPda: Address,
): Promise<VaultTokenInfo[]> {
  const result = await rpc
    .getTokenAccountsByOwner(
      vaultPda,
      { programId: TOKEN_PROGRAM_ADDRESS },
      { encoding: "jsonParsed" },
    )
    .send();

  const tokens: VaultTokenInfo[] = [];
  for (const item of result.value) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = (item.account.data as any)?.parsed;
    if (!parsed?.info) continue;
    const info = parsed.info;
    const rawAmount = info.tokenAmount?.amount;
    if (!rawAmount || rawAmount === "0") continue;
    tokens.push({
      mint: info.mint,
      address: item.pubkey,
      amount: BigInt(rawAmount),
      decimals: info.tokenAmount?.decimals ?? 0,
    });
  }
  return tokens;
}
