import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  decodeEstate,
  fetchMaybeEstate,
  findEstatePda,
  HEIRLOOM_PROGRAM_ADDRESS,
  type Estate,
  type InitializeAsyncInput,
} from "@historiah/heirloom";
import {
  type Address,
  type Base58EncodedBytes,
  type Base64EncodedBytes,
  type Instruction,
  type MaybeAccount,
  type TransactionSigner,
  address as toAddress,
} from "@solana/kit";
import type { VaultTokenHolding } from "@/types";
import { fetchAssetsByOwner } from "@/services/das";
import { SOLANA_RPC_ENDPOINT } from "@/config";
import {
  buildInitializeIx,
  buildUpdateFieldsIx,
  buildRevokeIx,
  buildClaimIx,
  buildDelegateDeferIx,
  buildRegisterAssetIx,
  buildUpdateHeirIx,
  buildTransferSolIx,
  buildTransferTokenIx,
} from "@/lib/heirloom/instructions";
import { sendTx, type HeirloomClient } from "@/lib/heirloom/client";
import {
  getEstateAddress,
  getVaultAddress,
  getEstateVaultPair,
  getAssetRecordAddress,
} from "@/lib/heirloom/pdas";

// Re-export types used by consumers
export type { HeirloomClient, VaultTokenHolding };

// ---------------------------------------------------------------------------
// Estate state machine
// ---------------------------------------------------------------------------

export type EstateUiState = "active" | "grace" | "claimable" | "distributed";

export interface EstateStateResult {
  state: EstateUiState;
  secondsUntilGrace: number;
  secondsUntilClaimable: number;
}

export interface ComputeEstateStateArgs {
  lastHeartbeat: number;
  heartbeatInterval: number;
  gracePeriod: number;
  pausedUntil: number;
  createdAt: number;
  vaultEmpty: boolean;
}

export function computeEstateState(args: ComputeEstateStateArgs): EstateStateResult {
  const { lastHeartbeat, heartbeatInterval, gracePeriod, pausedUntil, createdAt, vaultEmpty } = args;

  if (vaultEmpty) {
    return { state: "distributed", secondsUntilGrace: 0, secondsUntilClaimable: 0 };
  }
  const anchor = lastHeartbeat > 0 ? lastHeartbeat : createdAt;
  const now = Math.floor(Date.now() / 1000);
  const graceDeadline = anchor + heartbeatInterval;
  const claimableAt = Math.max(graceDeadline + gracePeriod, pausedUntil);

  if (now >= claimableAt) {
    return { state: "claimable", secondsUntilGrace: 0, secondsUntilClaimable: 0 };
  }
  if (now >= graceDeadline) {
    return { state: "grace", secondsUntilGrace: 0, secondsUntilClaimable: claimableAt - now };
  }
  return { state: "active", secondsUntilGrace: graceDeadline - now, secondsUntilClaimable: claimableAt - now };
}

// ---------------------------------------------------------------------------
// Estate snapshot builders
// ---------------------------------------------------------------------------

// Ties EstateLike's mirrored field names to the generated Estate account type.
// If the on-chain schema drops or renames one of these, this line fails to
// compile instead of EstateLike silently drifting out of sync.
export type EstateMirroredFields = Pick<
  Estate,
  | "label"
  | "delegate"
  | "hbSigner"
  | "heartbeatInterval"
  | "gracePeriod"
  | "pauseDuration"
  | "lastHeartbeat"
  | "createdAt"
  | "pausedUntil"
  | "claimableAssets"
>;

export interface EstateSnapshot {
  authority: string;
  heir: string;
  label: string;
  // Derived from pausedUntil, not a stored field — see delegate_defer's
  // `paused_until == 0` check, which is the on-chain source of truth for this.
  isDeferred: boolean;
  delegate: string | null;
  hbSigner: string | null;
  heartbeatInterval: number;
  gracePeriod: number;
  pauseDuration: number;
  lastHeartbeat: number;
  createdAt: number;
  pausedUntil: number;
  claimableAssets: number;
  solBalance: number;
  vaultTokens: VaultTokenHolding[];
  vaultState: EstateUiState;
  secondsUntilGrace: number;
  secondsUntilClaimable: number;
}

export interface EstateLike {
  label: string;
  delegate: unknown;
  hbSigner: unknown;
  heartbeatInterval: bigint | number;
  gracePeriod: bigint | number;
  pauseDuration: bigint | number;
  lastHeartbeat: bigint | number;
  createdAt: bigint | number;
  pausedUntil: bigint | number;
  claimableAssets: number;
}

function unwrapOption(opt: unknown): string | null {
  if (opt && typeof opt === "object" && "__option" in opt) {
    const o = opt as { __option: "Some" | "None"; value?: unknown };
    return o.__option === "Some" && o.value !== undefined ? String(o.value) : null;
  }
  return null;
}

export async function buildSnapshotFromEstate(
  client: HeirloomClient,
  authorityStr: string,
  heirStr: string,
  estateData: EstateLike,
): Promise<EstateSnapshot> {
  const authority = toAddress(authorityStr);
  const heir = toAddress(heirStr);
  const vaultPda = await getVaultAddress(authority, heir);
  const [lamports, vaultTokens] = await Promise.all([
    fetchVaultClaimableLamports(client, vaultPda),
    discoverVaultTokenAccounts(vaultPda),
  ]);

  const lastHeartbeat = Number(estateData.lastHeartbeat);
  const heartbeatInterval = Number(estateData.heartbeatInterval);
  const gracePeriod = Number(estateData.gracePeriod);
  const pausedUntil = Number(estateData.pausedUntil);
  const createdAt = Number(estateData.createdAt);
  const claimableAssets = estateData.claimableAssets;
  const vaultEmpty = claimableAssets === 0 && Number(lamports) === 0 && vaultTokens.length === 0;

  const { state, secondsUntilGrace, secondsUntilClaimable } = computeEstateState({
    lastHeartbeat,
    heartbeatInterval,
    gracePeriod,
    pausedUntil,
    createdAt,
    vaultEmpty,
  });

  return {
    authority: authorityStr,
    heir: heirStr,
    label: estateData.label,
    isDeferred: pausedUntil > 0,
    delegate: unwrapOption(estateData.delegate),
    hbSigner: unwrapOption(estateData.hbSigner),
    heartbeatInterval,
    gracePeriod,
    pauseDuration: Number(estateData.pauseDuration),
    lastHeartbeat,
    createdAt,
    pausedUntil,
    claimableAssets,
    solBalance: Number(lamports),
    vaultTokens,
    vaultState: state,
    secondsUntilGrace,
    secondsUntilClaimable,
  };
}

export async function lookupEstateSnapshot(
  client: HeirloomClient,
  authorityStr: string,
  heirStr: string,
): Promise<EstateSnapshot | null> {
  try {
    const authority = toAddress(authorityStr);
    const heir = toAddress(heirStr);
    const maybe = await fetchEstateByPair(client, authority, heir);
    if (!maybe.exists) return null;
    return await buildSnapshotFromEstate(client, authorityStr, heirStr, maybe.data);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Account reads (RPC) — moved from lib/heirloom/accounts.ts
// ---------------------------------------------------------------------------

export type EstateAccount = MaybeAccount<Estate>;

export async function fetchEstateByPair(
  client: HeirloomClient,
  authority: Address,
  heir: Address,
): Promise<EstateAccount> {
  const [pda] = await findEstatePda({ authority, heir });
  return fetchMaybeEstate(client.rpc, pda);
}

export async function fetchVaultClaimableLamports(
  client: HeirloomClient,
  vaultPda: Address,
): Promise<bigint> {
  const { value } = await client.rpc
    .getAccountInfo(vaultPda, { encoding: "base64", commitment: "confirmed" })
    .send();
  if (!value) return 0n;
  const rentMin = await client.rpc.getMinimumBalanceForRentExemption(value.space).send();
  const balance = value.lamports as unknown as bigint;
  return balance > rentMin ? balance - rentMin : 0n;
}

export async function fetchEstatesByAuthority(
  client: HeirloomClient,
  authority: Address,
): Promise<Array<{ address: Address; data: Estate }>> {
  return fetchEstatesByMemcmp(client, { offset: 8n, addr: authority });
}

export async function fetchEstatesByHeir(
  client: HeirloomClient,
  heir: Address,
): Promise<Array<{ address: Address; data: Estate }>> {
  return fetchEstatesByMemcmp(client, { offset: 40n, addr: heir });
}

async function fetchEstatesByMemcmp(
  client: HeirloomClient,
  match: { offset: bigint; addr: Address },
): Promise<Array<{ address: Address; data: Estate }>> {
  const accounts = await client.rpc
    .getProgramAccounts(HEIRLOOM_PROGRAM_ADDRESS, {
      encoding: "base64",
      filters: [
        {
          memcmp: {
            offset: 0n,
            bytes: "wRfOPWjh090=" as unknown as Base64EncodedBytes,
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
    if (Number(item.account.lamports) <= 0) continue;

    const b64: string = Array.isArray(item.account.data) ? item.account.data[0] : item.account.data;
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
        programAddress: HEIRLOOM_PROGRAM_ADDRESS,
      });
      out.push({ address: item.pubkey as Address, data: decoded.data });
    } catch {
      // Stale layout or partially-initialized account — skip.
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Token discovery (DAS) — moved from lib/heirloom/tokens.ts
// ---------------------------------------------------------------------------

export async function discoverVaultTokenAccounts(vaultPda: Address): Promise<VaultTokenHolding[]> {
  if (!SOLANA_RPC_ENDPOINT) return [];

  const assets = await fetchAssetsByOwner(SOLANA_RPC_ENDPOINT, vaultPda, new AbortController().signal);

  return Promise.all(
    assets.map(async (asset) => {
      const mint = toAddress(asset.id);
      const tokenProgram = toAddress(asset.token_info?.token_program ?? TOKEN_PROGRAM_ADDRESS);
      const [ata] = await findAssociatedTokenPda({ owner: vaultPda, mint, tokenProgram });
      return {
        mint: asset.id,
        ata: ata as string,
        rawAmount: BigInt(asset.token_info?.balance ?? 0),
        decimals: asset.token_info?.decimals ?? 0,
        tokenProgram: asset.token_info?.token_program ?? TOKEN_PROGRAM_ADDRESS,
      };
    }),
  );
}

// ---------------------------------------------------------------------------
// Transaction orchestration — combines builders + PDAs + sendTx
// ---------------------------------------------------------------------------

export interface TokenAsset {
  mint: Address;
  vaultTokenAccount: Address;
  authorityTokenAccount: Address;
  treasuryTokenAccount: Address;
  tokenProgram?: Address;
}

export interface ClaimTokenAsset {
  mint: Address;
  vaultTokenAccount: Address;
  heirTokenAccount: Address;
  treasuryTokenAccount?: Address;
  tokenProgram?: Address;
}

export interface TokenRegistration {
  mint: Address;
  amount: bigint;
  tokenProgram?: Address;
}

export async function initialize(
  client: HeirloomClient,
  authority: TransactionSigner,
  input: Omit<InitializeAsyncInput, "authority" | "estate" | "vault">,
): Promise<string> {
  const { estate, vault } = await getEstateVaultPair(authority.address, input.heir);
  const assetRecord = input.mint ? await getAssetRecordAddress(estate, input.mint) : undefined;
  const ix = await buildInitializeIx(authority, estate, vault, { ...input, assetRecord });
  return sendTx(client, authority, ix);
}

export async function updateFields(
  client: HeirloomClient,
  authority: TransactionSigner,
  input: {
    heir: Address;
    authorityAddress?: Address;
    heartbeatInterval?: number | bigint | null;
    gracePeriod?: number | bigint | null;
    pauseDuration?: number | bigint | null;
    label?: string | null;
  },
): Promise<string> {
  const authorityAddr = input.authorityAddress ?? authority.address;
  const estate = await getEstateAddress(authorityAddr, input.heir);
  const ix = buildUpdateFieldsIx(authority, input.heir, estate, {
    heartbeatInterval: input.heartbeatInterval,
    gracePeriod: input.gracePeriod,
    pauseDuration: input.pauseDuration,
    label: input.label,
  });
  return sendTx(client, authority, ix);
}

export async function revoke(
  client: HeirloomClient,
  authority: TransactionSigner,
  input: {
    heir: Address;
    mint?: Address;
    tokenProgram?: Address;
    vaultTokenAccount?: Address;
    authorityTokenAccount?: Address;
    treasuryTokenAccount?: Address;
  },
): Promise<string> {
  const { estate, vault } = await getEstateVaultPair(authority.address, input.heir);
  const assetRecord = input.mint ? await getAssetRecordAddress(estate, input.mint) : undefined;
  const ix = await buildRevokeIx(authority, input.heir, estate, vault, {
    mint: input.mint,
    tokenProgram: input.tokenProgram,
    vaultTokenAccount: input.vaultTokenAccount,
    authorityTokenAccount: input.authorityTokenAccount,
    treasuryTokenAccount: input.treasuryTokenAccount,
    assetRecord,
  });
  return sendTx(client, authority, ix);
}

export async function claim(
  client: HeirloomClient,
  heir: TransactionSigner,
  input: {
    authority: Address;
    mint?: Address;
    tokenProgram?: Address;
    vaultTokenAccount?: Address;
    heirTokenAccount?: Address;
    treasuryTokenAccount?: Address;
    delegate?: Address;
  },
): Promise<string> {
  const { estate, vault } = await getEstateVaultPair(input.authority, heir.address);
  const assetRecord = input.mint ? await getAssetRecordAddress(estate, input.mint) : undefined;
  const ix = await buildClaimIx(heir, input.authority, estate, vault, {
    mint: input.mint,
    tokenProgram: input.tokenProgram,
    vaultTokenAccount: input.vaultTokenAccount,
    heirTokenAccount: input.heirTokenAccount,
    treasuryTokenAccount: input.treasuryTokenAccount,
    delegate: input.delegate,
    assetRecord,
  });
  return sendTx(client, heir, ix);
}

export async function delegateDefer(
  client: HeirloomClient,
  delegate: TransactionSigner,
  input: { authority: Address; heir: Address },
): Promise<string> {
  const estate = await getEstateAddress(input.authority, input.heir);
  const ix = await buildDelegateDeferIx(delegate, input.authority, input.heir, estate);
  return sendTx(client, delegate, ix);
}

export async function registerAsset(
  client: HeirloomClient,
  authority: TransactionSigner,
  input: {
    heir: Address;
    mint: Address;
    amount: bigint;
    tokenProgram?: Address;
  },
): Promise<string> {
  const { estate, vault } = await getEstateVaultPair(authority.address, input.heir);
  const tokenProgram = input.tokenProgram ?? TOKEN_PROGRAM_ADDRESS;
  const [[vaultTokenAccount], [authorityTokenAccount], assetRecord] = await Promise.all([
    findAssociatedTokenPda({ owner: vault, mint: input.mint, tokenProgram }),
    findAssociatedTokenPda({ owner: authority.address, mint: input.mint, tokenProgram }),
    getAssetRecordAddress(estate, input.mint),
  ]);
  const ix = await buildRegisterAssetIx(
    authority,
    input.heir,
    estate,
    vault,
    input.mint,
    input.amount,
    vaultTokenAccount,
    authorityTokenAccount,
    assetRecord,
    tokenProgram,
  );
  return sendTx(client, authority, ix);
}

export async function registerSolDeposit(
  client: HeirloomClient,
  authority: TransactionSigner,
  input: { heir: Address; amount: bigint },
): Promise<string> {
  const { estate, vault } = await getEstateVaultPair(authority.address, input.heir);
  const ix = await buildRegisterAssetIx(authority, input.heir, estate, vault, input.heir, input.amount, estate, estate);
  return sendTx(client, authority, ix);
}

export async function revokeAll(
  client: HeirloomClient,
  authority: TransactionSigner,
  heir: Address,
  tokens: TokenAsset[],
  revokeSol: boolean,
): Promise<string> {
  const { estate, vault } = await getEstateVaultPair(authority.address, heir);
  const ixs: Instruction[] = [];

  for (const t of tokens) {
    const assetRecord = await getAssetRecordAddress(estate, t.mint);
    const ix = await buildRevokeIx(authority, heir, estate, vault, {
      mint: t.mint,
      tokenProgram: t.tokenProgram,
      vaultTokenAccount: t.vaultTokenAccount,
      authorityTokenAccount: t.authorityTokenAccount,
      treasuryTokenAccount: t.treasuryTokenAccount,
      assetRecord,
    });
    ixs.push(ix as Instruction);
  }

  if (revokeSol) {
    const ix = await buildRevokeIx(authority, heir, estate, vault);
    ixs.push(ix as Instruction);
  }

  return sendTx(client, authority, ixs);
}

export async function claimAll(
  client: HeirloomClient,
  heir: TransactionSigner,
  authority: Address,
  tokens: ClaimTokenAsset[],
  claimSol: boolean,
  delegate?: Address,
): Promise<string> {
  const { estate, vault } = await getEstateVaultPair(authority, heir.address);
  const ixs: Instruction[] = [];

  for (const t of tokens) {
    const assetRecord = await getAssetRecordAddress(estate, t.mint);
    const ix = await buildClaimIx(heir, authority, estate, vault, {
      mint: t.mint,
      tokenProgram: t.tokenProgram,
      vaultTokenAccount: t.vaultTokenAccount,
      heirTokenAccount: t.heirTokenAccount,
      treasuryTokenAccount: t.treasuryTokenAccount,
      delegate,
      assetRecord,
    });
    ixs.push(ix as Instruction);
  }

  if (claimSol) {
    const ix = await buildClaimIx(heir, authority, estate, vault, { delegate });
    ixs.push(ix as Instruction);
  }

  return sendTx(client, heir, ixs);
}

export async function updateHeirAll(
  client: HeirloomClient,
  authority: TransactionSigner,
  heir: Address,
  newHeir: Address,
  onTx?: (txId: string) => void,
): Promise<string> {
  const vaultPda = await getVaultAddress(authority.address, heir);
  const vaultTokens = await discoverVaultTokenAccounts(vaultPda);

  const [newEstate, newVault, estate, vault] = await Promise.all([
    getEstateAddress(authority.address, newHeir),
    getVaultAddress(authority.address, newHeir),
    getEstateAddress(authority.address, heir),
    getVaultAddress(authority.address, heir),
  ]);

  const ixs: Instruction[] = [];

  for (const token of vaultTokens) {
    let newVaultTokenAccount: Address | undefined;
    if (token.tokenProgram) {
      [newVaultTokenAccount] = await findAssociatedTokenPda({
        owner: newVault,
        mint: token.mint as Address,
        tokenProgram: token.tokenProgram as Address,
      });
    }
    const [assetRecord, newAssetRecord] = await Promise.all([
      getAssetRecordAddress(estate, token.mint as Address),
      getAssetRecordAddress(newEstate, token.mint as Address),
    ]);

    const ix = await buildUpdateHeirIx(authority, heir, newHeir, newEstate, newVault, estate, vault, {
      mint: token.mint as Address,
      tokenProgram: token.tokenProgram as Address,
      vaultTokenAccount: token.ata as Address,
      newVaultTokenAccount,
      assetRecord,
      newAssetRecord,
    });
    ixs.push(ix as Instruction);
  }

  const finalIx = await buildUpdateHeirIx(authority, heir, newHeir, newEstate, newVault, estate, vault);
  ixs.push(finalIx as Instruction);

  const txId = await sendTx(client, authority, ixs);
  onTx?.(txId);
  return txId;
}

export async function initializeWithTokens(
  client: HeirloomClient,
  authority: TransactionSigner,
  initInput: Omit<InitializeAsyncInput, "authority" | "estate" | "vault">,
  extraTokens: TokenRegistration[],
): Promise<string> {
  const { estate, vault } = await getEstateVaultPair(authority.address, initInput.heir);

  const initAssetRecord = initInput.mint
    ? await getAssetRecordAddress(estate, initInput.mint)
    : undefined;
  const initIx = await buildInitializeIx(authority, estate, vault, {
    ...initInput,
    assetRecord: initAssetRecord,
  });

  const registerIxs = await Promise.all(
    extraTokens.map(async (tok) => {
      const tokenProgram = tok.tokenProgram ?? TOKEN_PROGRAM_ADDRESS;
      const [[vaultTokenAccount], [authorityTokenAccount], assetRecord] = await Promise.all([
        findAssociatedTokenPda({ owner: vault, mint: tok.mint, tokenProgram }),
        findAssociatedTokenPda({ owner: authority.address, mint: tok.mint, tokenProgram }),
        getAssetRecordAddress(estate, tok.mint),
      ]);
      return buildRegisterAssetIx(
        authority,
        initInput.heir,
        estate,
        vault,
        tok.mint,
        tok.amount,
        vaultTokenAccount,
        authorityTokenAccount,
        assetRecord,
        tokenProgram,
      );
    }),
  );

  return sendTx(client, authority, [initIx, ...registerIxs]);
}

export async function depositSol(
  client: HeirloomClient,
  authority: TransactionSigner,
  vaultPda: Address,
  lamports: bigint,
): Promise<string> {
  const ix = buildTransferSolIx(authority, vaultPda, lamports);
  return sendTx(client, authority, ix);
}

export async function depositToken(
  client: HeirloomClient,
  authority: TransactionSigner,
  holding: VaultTokenHolding,
  amount: bigint,
): Promise<string> {
  const ix = await buildTransferTokenIx(authority, holding, amount);
  return sendTx(client, authority, ix);
}
