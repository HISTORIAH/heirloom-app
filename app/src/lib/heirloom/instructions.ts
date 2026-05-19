import { findAssociatedTokenPda, getTransferCheckedInstruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { getTransferSolInstruction } from "@solana-program/system";
import {
  getClaimInstructionAsync,
  getDelegateDeferInstructionAsync,
  getInitializeInstructionAsync,
  getRegisterAssetInstructionAsync,
  getRevokeInstructionAsync,
  getUpdateFieldInstruction,
  getUpdateHeirInstructionAsync,
  TREASURY_ADDRESS,
  type InitializeAsyncInput,
} from "@historiah/heirloom";
import { type Address, type Instruction, type TransactionSigner, address as toAddress } from "@solana/kit";
import type { VaultTokenHolding } from "@/types";
import type { HeirloomClient } from "./client";
import { sendTx } from "./client";
import { getEstateAddress, getVaultAddress } from "./pdas";
import { discoverVaultTokenAccounts } from "./tokens";

// ---------------------------------------------------------------------------
// Single instruction wrappers — thin, use generated client types directly
// ---------------------------------------------------------------------------

export async function initialize(
  client: HeirloomClient,
  authority: TransactionSigner,
  input: Omit<InitializeAsyncInput, "authority" | "estate" | "vault">,
): Promise<string> {
  const [estate, vault] = await Promise.all([
    getEstateAddress(authority.address, input.heir),
    getVaultAddress(authority.address, input.heir),
  ]);

  const ix = await getInitializeInstructionAsync({
    ...input,
    authority,
    estate,
    vault,
  });
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

  const ix = getUpdateFieldInstruction({
    authority,
    heir: input.heir,
    estate,
    heartbeatInterval: input.heartbeatInterval ?? null,
    gracePeriod: input.gracePeriod ?? null,
    pauseDuration: input.pauseDuration ?? null,
    label: input.label ?? null,
  });
  return sendTx(client, authority, ix);
}

export async function revoke(
  client: HeirloomClient,
  authority: TransactionSigner,
  input: { heir: Address; mint?: Address; tokenProgram?: Address; vaultTokenAccount?: Address; authorityTokenAccount?: Address; treasuryTokenAccount?: Address },
): Promise<string> {
  const [estate, vault] = await Promise.all([
    getEstateAddress(authority.address, input.heir),
    getVaultAddress(authority.address, input.heir),
  ]);

  const ix = await getRevokeInstructionAsync({
    authority,
    heir: input.heir,
    mint: input.mint,
    tokenProgram: input.tokenProgram,
    vaultTokenAccount: input.vaultTokenAccount,
    authorityTokenAccount: input.authorityTokenAccount,
    treasuryTokenAccount: input.treasuryTokenAccount,
    estate,
    vault,
    treasury: TREASURY_ADDRESS,
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
  const [estate, vault] = await Promise.all([
    getEstateAddress(input.authority, heir.address),
    getVaultAddress(input.authority, heir.address),
  ]);

  const ix = await getClaimInstructionAsync({
    heir,
    authority: input.authority,
    mint: input.mint,
    tokenProgram: input.tokenProgram,
    vaultTokenAccount: input.vaultTokenAccount,
    heirTokenAccount: input.heirTokenAccount,
    treasuryTokenAccount: input.treasuryTokenAccount,
    delegate: input.delegate,
    estate,
    vault,
    treasury: TREASURY_ADDRESS,
  });
  return sendTx(client, heir, ix);
}

export async function delegateDefer(
  client: HeirloomClient,
  delegate: TransactionSigner,
  input: { authority: Address; heir: Address },
): Promise<string> {
  const estate = await getEstateAddress(input.authority, input.heir);

  const ix = await getDelegateDeferInstructionAsync({
    delegate,
    authority: input.authority,
    heir: input.heir,
    estate,
  });
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
  const [vaultPda, estate, vault] = await Promise.all([
    getVaultAddress(authority.address, input.heir),
    getEstateAddress(authority.address, input.heir),
    getVaultAddress(authority.address, input.heir),
  ]);

  const tokenProgram = input.tokenProgram ?? TOKEN_PROGRAM_ADDRESS;
  const [[vaultTokenAccount], [authorityTokenAccount]] = await Promise.all([
    findAssociatedTokenPda({ owner: vaultPda, mint: input.mint, tokenProgram }),
    findAssociatedTokenPda({ owner: authority.address, mint: input.mint, tokenProgram }),
  ]);

  const ix = await getRegisterAssetInstructionAsync({
    authority,
    heir: input.heir,
    mint: input.mint,
    amount: input.amount,
    tokenProgram,
    estate,
    vault,
    vaultTokenAccount,
    authorityTokenAccount,
  });
  return sendTx(client, authority, ix);
}

export async function registerSolDeposit(
  client: HeirloomClient,
  authority: TransactionSigner,
  input: { heir: Address; amount: bigint },
): Promise<string> {
  const [estate, vault] = await Promise.all([
    getEstateAddress(authority.address, input.heir),
    getVaultAddress(authority.address, input.heir),
  ]);

  const ix = await getRegisterAssetInstructionAsync({
    authority,
    heir: input.heir,
    estate,
    vault,
    amount: input.amount,
  });
  return sendTx(client, authority, ix);
}

// ---------------------------------------------------------------------------
// Multi-step flows — sequential transactions for complex operations
// ---------------------------------------------------------------------------

export interface TokenAsset {
  mint: Address;
  vaultTokenAccount: Address;
  authorityTokenAccount: Address;
  treasuryTokenAccount: Address;
  tokenProgram?: Address;
}

/**
 * Revoke all assets in a SINGLE transaction.
 */
export async function revokeAll(
  client: HeirloomClient,
  authority: TransactionSigner,
  heir: Address,
  tokens: TokenAsset[],
  revokeSol: boolean,
): Promise<string> {
  const [estate, vault] = await Promise.all([
    getEstateAddress(authority.address, heir),
    getVaultAddress(authority.address, heir),
  ]);

  const ixs: Instruction[] = [];

  for (const t of tokens) {
    const ix = await getRevokeInstructionAsync({
      authority,
      heir,
      mint: t.mint,
      tokenProgram: t.tokenProgram,
      vaultTokenAccount: t.vaultTokenAccount,
      authorityTokenAccount: t.authorityTokenAccount,
      treasuryTokenAccount: t.treasuryTokenAccount,
      estate,
      vault,
      treasury: TREASURY_ADDRESS,
    });
    ixs.push(ix as Instruction);
  }

  if (revokeSol) {
    const ix = await getRevokeInstructionAsync({ authority, heir, estate, vault, treasury: TREASURY_ADDRESS });
    ixs.push(ix as Instruction);
  }

  return sendTx(client, authority, ixs);
}

export interface ClaimTokenAsset {
  mint: Address;
  vaultTokenAccount: Address;
  heirTokenAccount: Address;
  treasuryTokenAccount?: Address;
  tokenProgram?: Address;
}

/**
 * Claim all assets in a SINGLE transaction.
 */
export async function claimAll(
  client: HeirloomClient,
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

  const ixs: Instruction[] = [];

  for (const t of tokens) {
    const ix = await getClaimInstructionAsync({
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
    });
    ixs.push(ix as Instruction);
  }

  if (claimSol) {
    const ix = await getClaimInstructionAsync({ heir, authority, delegate, estate, vault, treasury: TREASURY_ADDRESS });
    ixs.push(ix as Instruction);
  }
  console.log("claim sol ixs length", ixs.length)

  return sendTx(client, heir, ixs);
}

/**
 * Update heir: migrate ALL assets to a new heir in a SINGLE transaction.
 *
 * All token migrations + final SOL call are bundled into one tx.
 * The program only closes old estate/vault on the SOL-only path.
 */
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

    const ix = await getUpdateHeirInstructionAsync({
      authority,
      heir,
      newHeir,
      newEstate,
      newVault,
      estate,
      vault,
      mint: token.mint as Address,
      tokenProgram: token.tokenProgram as Address,
      vaultTokenAccount: token.ata as Address,
      newVaultTokenAccount,
    });
    ixs.push(ix as Instruction);
  }

  // Final SOL-only call: closes old PDAs, moves SOL to new vault.
  const finalIx = await getUpdateHeirInstructionAsync({
    authority,
    heir,
    newHeir,
    newEstate,
    newVault,
    estate,
    vault,
  });
  ixs.push(finalIx as Instruction);

  const txId = await sendTx(client, authority, ixs);
  onTx?.(txId);
  return txId;
}

// ---------------------------------------------------------------------------
// Initialize with tokens — bundles init + register_asset ixs in one tx
// ---------------------------------------------------------------------------

export interface TokenRegistration {
  mint: Address;
  amount: bigint;
  tokenProgram?: Address;
}

export async function initializeWithTokens(
  client: HeirloomClient,
  authority: TransactionSigner,
  initInput: Omit<InitializeAsyncInput, "authority" | "estate" | "vault">,
  extraTokens: TokenRegistration[],
): Promise<string> {
  const [estate, vault] = await Promise.all([
    getEstateAddress(authority.address, initInput.heir),
    getVaultAddress(authority.address, initInput.heir),
  ]);

  const initIx = await getInitializeInstructionAsync({
    ...initInput,
    authority,
    estate,
    vault,
  });

  const registerIxs = await Promise.all(
    extraTokens.map(async (tok) => {
      const tokenProgram = tok.tokenProgram ?? TOKEN_PROGRAM_ADDRESS;
      const [[vaultTokenAccount], [authorityTokenAccount]] = await Promise.all([
        findAssociatedTokenPda({ owner: vault, mint: tok.mint, tokenProgram }),
        findAssociatedTokenPda({ owner: authority.address, mint: tok.mint, tokenProgram }),
      ]);

      return getRegisterAssetInstructionAsync({
        authority,
        heir: initInput.heir,
        mint: tok.mint,
        amount: tok.amount,
        tokenProgram,
        vaultTokenAccount,
        authorityTokenAccount,
        estate,
        vault,
      });
    }),
  );

  return sendTx(client, authority, [initIx, ...registerIxs]);
}

// ---------------------------------------------------------------------------
// Top-up transfers — plain system/token transfers into an existing vault
// ---------------------------------------------------------------------------

export async function depositSol(
  client: HeirloomClient,
  authority: TransactionSigner,
  vaultPda: Address,
  lamports: bigint,
): Promise<string> {
  const ix = getTransferSolInstruction({ source: authority, destination: vaultPda, amount: lamports });
  return sendTx(client, authority, ix);
}

export async function depositToken(
  client: HeirloomClient,
  authority: TransactionSigner,
  holding: VaultTokenHolding,
  amount: bigint,
): Promise<string> {
  const mint = toAddress(holding.mint);
  const tokenProgram = toAddress(holding.tokenProgram);
  const [authorityAta] = await findAssociatedTokenPda({ owner: authority.address, mint, tokenProgram });
  const ix = getTransferCheckedInstruction(
    {
      source: authorityAta,
      mint,
      destination: toAddress(holding.ata),
      authority,
      amount,
      decimals: holding.decimals,
    },
    { programAddress: tokenProgram },
  );
  return sendTx(client, authority, ix);
}
