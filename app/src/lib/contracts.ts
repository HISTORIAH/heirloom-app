import {
  appendTransactionMessageInstruction,
  createTransactionMessage,
  getBase58Decoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  type Address,
  type Base58EncodedBytes,
  type Base64EncodedBytes,
  type MaybeAccount,
  type TransactionSigner,
} from "@solana/kit";
import {
  decodeEstate,
  fetchMaybeEstate,
  findEstatePda,
  findVaultPda,
  getClaimInstructionAsync,
  getDelegateDeferInstructionAsync,
  getInitializeInstructionAsync,
  getRegisterAssetInstructionAsync,
  getRevokeInstructionAsync,
  getUpdateFieldsInstructionAsync,
  getUpdateHeirInstructionAsync,
  HEIRLOOM_PROGRAM_PROGRAM_ADDRESS,
  TREASURY_ADDRESS,
  type Estate,
} from "@historiah/heirloom";
import {
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import type { AppRpc, AppRpcSubscriptions } from "@/contexts/WalletContext";

export type Client = {
  rpc: AppRpc;
  rpcSubscriptions: AppRpcSubscriptions;
};

export type EstateAccount = MaybeAccount<Estate>;

const base58 = getBase58Decoder();

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
 * Returns the claimable SOL in a vault (lamports above rent-exempt minimum).
 * The vault PDA's raw balance includes the rent-exempt reserve, which is not
 * user-allocated funds — subtract it so the UI shows the true deposit.
 */
export async function fetchVaultClaimableLamports(
  rpc: AppRpc,
  vaultPda: Address,
): Promise<bigint> {
  const { value } = await rpc
    .getAccountInfo(vaultPda, { encoding: "base64", commitment: "confirmed" })
    .send();
  if (!value) return 0n;
  const rentMin = await rpc
    .getMinimumBalanceForRentExemption(value.space)
    .send();
  const balance = value.lamports as unknown as bigint;
  return balance > rentMin ? balance - rentMin : 0n;
}

/**
 * Fetch all Estate accounts where the given address is the authority,
 * directly from the chain using getProgramAccounts with memcmp filters.
 *
 * Estate layout: discriminator(1) | authority(32) | heir(32) | ...
 * Filter: discriminator == 1 (estate) AND authority == wallet address.
 */
 // TODO: GENERATED PROGRAMS PROVIDE A WAY TO FETCH ACCOUNTS
export async function fetchEstatesByAuthority(
  rpc: AppRpc,
  authority: Address,
): Promise<Array<{ address: Address; data: Estate }>> {
  return fetchEstatesByMemcmp(rpc, { offset: 1n, addr: authority });
}

/**
 * Fetch all Estate accounts where the given address is the heir.
 * Heir is at offset 33 (1 discriminator + 32 authority).
 */
export async function fetchEstatesByHeir(
  rpc: AppRpc,
  heir: Address,
): Promise<Array<{ address: Address; data: Estate }>> {
  return fetchEstatesByMemcmp(rpc, { offset: 33n, addr: heir });
}

async function fetchEstatesByMemcmp(
  rpc: AppRpc,
  match: { offset: bigint; addr: Address },
): Promise<Array<{ address: Address; data: Estate }>> {
  const accounts = await rpc
    .getProgramAccounts(HEIRLOOM_PROGRAM_PROGRAM_ADDRESS, {
      encoding: "base64",
      filters: [
        // Estate discriminator = [1] → base64 "AQ=="
        {
          memcmp: {
            offset: 0n,
            bytes: "AQ==" as unknown as Base64EncodedBytes,
            encoding: "base64",
          },
        },
        {
          memcmp: {
            offset: match.offset,
            bytes: match.addr as unknown as Base58EncodedBytes,
            encoding: "base58",
          },
        },
      ],
    })
    .send();

  const out: Array<{ address: Address; data: Estate }> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of accounts as any[]) {
    const b64: string = Array.isArray(item.account.data)
      ? item.account.data[0]
      : item.account.data;
    const binary = atob(b64);
    const raw = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) raw[i] = binary.charCodeAt(i);

    try {
      const decoded = decodeEstate({
        address: item.pubkey,
        data: raw,
        executable: item.account.executable,
        lamports: item.account.lamports,
        space: BigInt(raw.length),
        programAddress: HEIRLOOM_PROGRAM_PROGRAM_ADDRESS,
      });
      out.push({ address: item.pubkey as Address, data: decoded.data });
    } catch (err) {
      // Stale layout or partially-initialized account — skip, don't poison the batch.
      console.warn(`Skipping undecodable estate at ${item.pubkey}:`, err);
    }
  }
  return out;
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
  hbSigner?: Address;
  mint?: Address;
  tokenProgram?: Address;
  authorityTokenAccount?: Address;
  vaultTokenAccount?: Address;
}

export async function sendInitialize(
  client: Client,
  args: InitializeArgs,
): Promise<string> {
  const [estate, vault] = await Promise.all([
    getEstateAddress(args.authority.address, args.heir),
    getVaultAddress(args.authority.address, args.heir),
  ]);

  const ix = await getInitializeInstructionAsync({
    authority: args.authority,
    heir: args.heir,
    delegate: args.delegate,
    hbSigner: args.hbSigner,
    authorityTokenAccount: args.authorityTokenAccount,
    vaultTokenAccount: args.vaultTokenAccount,
    mint: args.mint,
    tokenProgram: args.tokenProgram,
    heartbeatInterval: args.heartbeatInterval,
    gracePeriod: args.gracePeriod,
    pauseDuration: args.pauseDuration,
    amount: args.amount,
    label: args.label,
    estate,
    vault,
  });
  return sendTx(client, args.authority, ix);
}

export interface UpdateArgs {
  /**
   * Signer for the update_fields ix. Must be either the estate authority
   * (full permissions) or the registered hb_signer (heartbeat-only).
   * The estate is always derived from (authorityAddress, heir) — when the
   * signer is the hb_signer, pass authorityAddress separately.
   */
  authority: TransactionSigner;
  /**
   * Address used as the estate-derivation authority. Defaults to the signer's
   * address when omitted (the common authority-signs case).
   */
  authorityAddress?: Address;
  heir: Address;
  heartbeatInterval?: bigint | null;
  gracePeriod?: bigint | null;
  pauseDuration?: bigint | null;
  label?: string | null;
}

export async function sendUpdate(
  client: Client,
  args: UpdateArgs,
): Promise<string> {
  const authorityAddr = args.authorityAddress ?? args.authority.address;
  const estate = await getEstateAddress(authorityAddr, args.heir);

  const ix = await getUpdateFieldsInstructionAsync({
    authority: args.authority,
    heir: args.heir,
    heartbeatInterval: args.heartbeatInterval ?? null,
    gracePeriod: args.gracePeriod ?? null,
    pauseDuration: args.pauseDuration ?? null,
    label: args.label ?? null,
    estate,
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
  treasuryTokenAccount?: Address;
}

export async function sendRevoke(
  client: Client,
  args: RevokeArgs,
): Promise<string> {
  const [estate, vault] = await Promise.all([
    getEstateAddress(args.authority.address, args.heir),
    getVaultAddress(args.authority.address, args.heir),
  ]);

  const revokeIx = await getRevokeInstructionAsync({
    authority: args.authority,
    heir: args.heir,
    mint: args.mint,
    tokenProgram: args.tokenProgram,
    authorityTokenAccount: args.authorityTokenAccount,
    vaultTokenAccount: args.vaultTokenAccount,
    treasuryTokenAccount: args.treasuryTokenAccount,
    estate,
    treasury: TREASURY_ADDRESS,
    vault,
  });

  return sendTx(client, args.authority, revokeIx);
}

export interface RevokeTokenAsset {
  mint: Address;
  vaultTokenAccount: Address;
  authorityTokenAccount: Address;
  treasuryTokenAccount: Address;
  tokenProgram?: Address;
}

/**
 * Revokes all tokens then SOL in a single transaction.
 * tokens must be ordered with all token revokes before the SOL revoke.
 */
export async function sendRevokeAll(
  client: Client,
  authority: TransactionSigner,
  heir: Address,
  tokens: RevokeTokenAsset[],
  revokeSol: boolean,
): Promise<string> {
  const [estate, vault] = await Promise.all([
    getEstateAddress(authority.address, heir),
    getVaultAddress(authority.address, heir),
  ]);

  const ixs: Ix[] = await Promise.all(
    tokens.map((t) =>
      getRevokeInstructionAsync({
        authority,
        heir,
        mint: t.mint,
        tokenProgram: t.tokenProgram,
        authorityTokenAccount: t.authorityTokenAccount,
        vaultTokenAccount: t.vaultTokenAccount,
        estate,
        vault,
        treasury: TREASURY_ADDRESS,
        treasuryTokenAccount: t.treasuryTokenAccount
      }),
    ),
  );

  if (revokeSol) {
    ixs.push(
      await getRevokeInstructionAsync({ authority, heir, estate, vault, treasury: TREASURY_ADDRESS }),
    );
  }

  return sendTx(client, authority, ixs);
}

export interface ClaimArgs {
  heir: TransactionSigner;
  authority: Address;
  mint?: Address;
  tokenProgram?: Address;
  vaultTokenAccount?: Address;
  heirTokenAccount?: Address;
  treasuryTokenAccount?: Address;
  delegate?: Address;
}

export async function sendClaim(
  client: Client,
  args: ClaimArgs,
): Promise<string> {
  const [estate, vault] = await Promise.all([
    getEstateAddress(args.authority, args.heir.address),
    getVaultAddress(args.authority, args.heir.address),
  ]);

  const claimIx = await getClaimInstructionAsync({
    heir: args.heir,
    authority: args.authority,
    mint: args.mint,
    tokenProgram: args.tokenProgram,
    vaultTokenAccount: args.vaultTokenAccount,
    heirTokenAccount: args.heirTokenAccount,
    delegate: args.delegate,
    treasury: TREASURY_ADDRESS,
    treasuryTokenAccount: args.treasuryTokenAccount,
    estate,
    vault,
  });

  return sendTx(client, args.heir, claimIx);
}

export interface ClaimTokenAsset {
  mint: Address;
  vaultTokenAccount: Address;
  heirTokenAccount: Address;
  treasuryTokenAccount?: Address;
  tokenProgram?: Address;
}

/**
 * Claims all tokens then SOL in a single transaction.
 * Tokens must come before SOL — the SOL claim closes the vault account.
 */
export async function sendClaimAll(
  client: Client,
  heir: TransactionSigner,
  authority: Address,
  tokens: ClaimTokenAsset[],
  claimSol: boolean,
  delegate?: Address,
): Promise<string> {
  const [estate, vault] = await Promise.all([
    getEstateAddress(authority, heir.address),
    getVaultAddress(authority, heir.address),
  ]);

  const ixs: Ix[] = await Promise.all(
    tokens.map((t) =>
      getClaimInstructionAsync({
        heir,
        authority,
        mint: t.mint,
        tokenProgram: t.tokenProgram,
        vaultTokenAccount: t.vaultTokenAccount,
        heirTokenAccount: t.heirTokenAccount,
        delegate,
        estate,
        vault,
        treasury: TREASURY_ADDRESS,
        treasuryTokenAccount: t.treasuryTokenAccount,
      }),
    ),
  );

  if (claimSol) {
    ixs.push(
      await getClaimInstructionAsync({ heir, authority, delegate, estate, vault, treasury: TREASURY_ADDRESS }),
    );
  }

  return sendTx(client, heir, ixs);
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
  const estate = await getEstateAddress(args.authority, args.heir);

  const ix = await getDelegateDeferInstructionAsync({
    delegate: args.delegate,
    authority: args.authority,
    heir: args.heir,
    estate,
  });
  return sendTx(client, args.delegate, ix);
}

// ---------------------------------------------------------------------------
// Update Heir — reassign estate to a new heir
// ---------------------------------------------------------------------------

export interface UpdateHeirArgs {
  authority: TransactionSigner;
  heir: Address;
  newHeir: Address;
  mint?: Address;
  tokenProgram?: Address;
  vaultTokenAccount?: Address;
}

export async function sendUpdateHeir(
  client: Client,
  args: UpdateHeirArgs,
): Promise<string> {
  const [newEstate, newVault, estate, vault] = await Promise.all([
    getEstateAddress(args.authority.address, args.newHeir),
    getVaultAddress(args.authority.address, args.newHeir),
    getEstateAddress(args.authority.address, args.heir),
    getVaultAddress(args.authority.address, args.heir),
  ]);

  let newVaultTokenAccount: Address | undefined;
  if (args.mint && args.tokenProgram) {
    [newVaultTokenAccount] = await findAssociatedTokenPda({
      owner: newVault,
      mint: args.mint,
      tokenProgram: args.tokenProgram,
    });
  }

  const ix = await getUpdateHeirInstructionAsync({
    authority: args.authority,
    heir: args.heir,
    newHeir: args.newHeir,
    newEstate,
    newVault,
    estate,
    vault,
    mint: args.mint,
    vaultTokenAccount: args.vaultTokenAccount,
    newVaultTokenAccount,
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
  tokenProgram?: Address;
}

async function buildRegisterAssetIx(
  authority: TransactionSigner,
  heir: Address,
  mint: Address,
  amount: bigint,
  tokenProgram: Address,
): Promise<Ix> {
  const [vaultPda] = await findVaultPda({ authority: authority.address, heir });
  const [vaultTokenAccount] = await findAssociatedTokenPda({
    owner: vaultPda,
    mint,
    tokenProgram,
  });
  const [authorityTokenAccount] = await findAssociatedTokenPda({
    owner: authority.address,
    mint,
    tokenProgram,
  });

  const [estate, vault] = await Promise.all([
    getEstateAddress(authority.address, heir),
    getVaultAddress(authority.address, heir),
  ]);

  return getRegisterAssetInstructionAsync({
    authority,
    heir,
    mint,
    vaultTokenAccount,
    authorityTokenAccount,
    tokenProgram,
    amount,
    estate,
    vault,
  });
}

/**
 * Registers a new token asset on an existing estate and deposits tokens.
 * The program handles token transfer internally — no separate transfer ix needed.
 */
export async function sendRegisterAndDeposit(
  client: Client,
  args: RegisterAndDepositArgs,
): Promise<string> {
  const tokenProgram = args.tokenProgram ?? TOKEN_PROGRAM_ADDRESS;
  const ix = await buildRegisterAssetIx(
    args.authority,
    args.heir,
    args.mint,
    args.amount,
    tokenProgram,
  );
  return sendTx(client, args.authority, ix);
}

export interface RegisterSolDepositArgs {
  authority: TransactionSigner;
  heir: Address;
  amount: bigint; // lamports
}

/**
 * Registers a SOL deposit on an existing estate. Uses the mint-less
 * register_asset path (program handles the SOL transfer internally).
 */
export async function sendRegisterSolDeposit(
  client: Client,
  args: RegisterSolDepositArgs,
): Promise<string> {
  const [estate, vault] = await Promise.all([
    getEstateAddress(args.authority.address, args.heir),
    getVaultAddress(args.authority.address, args.heir),
  ]);

  const ix = await getRegisterAssetInstructionAsync({
    authority: args.authority,
    heir: args.heir,
    estate,
    vault,
    amount: args.amount,
  });
  return sendTx(client, args.authority, ix);
}

export interface TokenRegistration {
  mint: Address;
  amount: bigint;
  tokenProgram?: Address;
}

/**
 * Bundles initialize + all token registrations into a single transaction.
 * initArgs describes the primary asset (SOL or first token).
 * extraTokens are additional tokens to register in the same tx.
 */
export async function sendInitializeWithTokens(
  client: Client,
  initArgs: InitializeArgs,
  extraTokens: TokenRegistration[],
): Promise<string> {
  const [estate, vault] = await Promise.all([
    getEstateAddress(initArgs.authority.address, initArgs.heir),
    getVaultAddress(initArgs.authority.address, initArgs.heir),
  ]);

  const initIx = await getInitializeInstructionAsync({
    authority: initArgs.authority,
    heir: initArgs.heir,
    delegate: initArgs.delegate,
    hbSigner: initArgs.hbSigner,
    authorityTokenAccount: initArgs.authorityTokenAccount,
    vaultTokenAccount: initArgs.vaultTokenAccount,
    mint: initArgs.mint,
    tokenProgram: initArgs.tokenProgram,
    heartbeatInterval: initArgs.heartbeatInterval,
    gracePeriod: initArgs.gracePeriod,
    pauseDuration: initArgs.pauseDuration,
    amount: initArgs.amount,
    label: initArgs.label,
    estate,
    vault,
  });

  const registerIxs = await Promise.all(
    extraTokens.map((tok) =>
      buildRegisterAssetIx(
        initArgs.authority,
        initArgs.heir,
        tok.mint,
        tok.amount,
        tok.tokenProgram ?? TOKEN_PROGRAM_ADDRESS,
      ),
    ),
  );

  return sendTx(client, initArgs.authority, [initIx, ...registerIxs]);
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
