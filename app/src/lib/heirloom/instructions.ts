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
import { findAssociatedTokenPda, getTransferCheckedInstruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { getTransferSolInstruction } from "@solana-program/system";
import { type Address, type Instruction, type TransactionSigner } from "@solana/kit";
import type { VaultTokenHolding } from "@/types";

// ---------------------------------------------------------------------------
// Pure instruction builders — no side effects, no network calls beyond PDA derivation
// ---------------------------------------------------------------------------

export async function buildInitializeIx(
  authority: TransactionSigner,
  estate: Address,
  vault: Address,
  input: Omit<InitializeAsyncInput, "authority" | "estate" | "vault">,
): Promise<Instruction> {
  return getInitializeInstructionAsync({
    ...input,
    authority,
    estate,
    vault,
  });
}

export function buildUpdateFieldsIx(
  authority: TransactionSigner,
  heir: Address,
  estate: Address,
  fields: {
    heartbeatInterval?: number | bigint | null;
    gracePeriod?: number | bigint | null;
    pauseDuration?: number | bigint | null;
    label?: string | null;
  },
): Instruction {
  return getUpdateFieldInstruction({
    authority,
    heir,
    estate,
    heartbeatInterval: fields.heartbeatInterval ?? null,
    gracePeriod: fields.gracePeriod ?? null,
    pauseDuration: fields.pauseDuration ?? null,
    label: fields.label ?? null,
  });
}

export async function buildRevokeIx(
  authority: TransactionSigner,
  heir: Address,
  estate: Address,
  vault: Address,
  opts?: {
    mint?: Address;
    tokenProgram?: Address;
    vaultTokenAccount?: Address;
    authorityTokenAccount?: Address;
    treasuryTokenAccount?: Address;
  },
): Promise<Instruction> {
  return getRevokeInstructionAsync({
    authority,
    heir,
    estate,
    vault,
    treasury: TREASURY_ADDRESS,
    mint: opts?.mint,
    tokenProgram: opts?.tokenProgram,
    vaultTokenAccount: opts?.vaultTokenAccount,
    authorityTokenAccount: opts?.authorityTokenAccount,
    treasuryTokenAccount: opts?.treasuryTokenAccount,
  });
}

export async function buildClaimIx(
  heir: TransactionSigner,
  authority: Address,
  estate: Address,
  vault: Address,
  opts?: {
    mint?: Address;
    tokenProgram?: Address;
    vaultTokenAccount?: Address;
    heirTokenAccount?: Address;
    treasuryTokenAccount?: Address;
    delegate?: Address;
  },
): Promise<Instruction> {
  return getClaimInstructionAsync({
    heir,
    authority,
    estate,
    vault,
    treasury: TREASURY_ADDRESS,
    mint: opts?.mint,
    tokenProgram: opts?.tokenProgram,
    vaultTokenAccount: opts?.vaultTokenAccount,
    heirTokenAccount: opts?.heirTokenAccount,
    treasuryTokenAccount: opts?.treasuryTokenAccount,
    delegate: opts?.delegate,
  });
}

export async function buildDelegateDeferIx(
  delegate: TransactionSigner,
  authority: Address,
  heir: Address,
  estate: Address,
): Promise<Instruction> {
  return getDelegateDeferInstructionAsync({
    delegate,
    authority,
    heir,
    estate,
  });
}

export async function buildRegisterAssetIx(
  authority: TransactionSigner,
  heir: Address,
  estate: Address,
  vault: Address,
  mint: Address,
  amount: bigint,
  vaultTokenAccount: Address,
  authorityTokenAccount: Address,
  tokenProgram?: Address,
): Promise<Instruction> {
  return getRegisterAssetInstructionAsync({
    authority,
    heir,
    mint,
    amount,
    tokenProgram: tokenProgram ?? TOKEN_PROGRAM_ADDRESS,
    estate,
    vault,
    vaultTokenAccount,
    authorityTokenAccount,
  });
}

export async function buildUpdateHeirIx(
  authority: TransactionSigner,
  heir: Address,
  newHeir: Address,
  newEstate: Address,
  newVault: Address,
  estate: Address,
  vault: Address,
  opts?: {
    mint?: Address;
    tokenProgram?: Address;
    vaultTokenAccount?: Address;
    newVaultTokenAccount?: Address;
  },
): Promise<Instruction> {
  return getUpdateHeirInstructionAsync({
    authority,
    heir,
    newHeir,
    newEstate,
    newVault,
    estate,
    vault,
    mint: opts?.mint,
    tokenProgram: opts?.tokenProgram,
    vaultTokenAccount: opts?.vaultTokenAccount,
    newVaultTokenAccount: opts?.newVaultTokenAccount,
  });
}

export function buildTransferSolIx(
  authority: TransactionSigner,
  destination: Address,
  lamports: bigint,
): Instruction {
  return getTransferSolInstruction({ source: authority, destination, amount: lamports });
}

export async function buildTransferTokenIx(
  authority: TransactionSigner,
  holding: VaultTokenHolding,
  amount: bigint,
): Promise<Instruction> {
  const mint = holding.mint as Address;
  const tokenProgram = holding.tokenProgram as Address;
  const [authorityAta] = await findAssociatedTokenPda({ owner: authority.address, mint, tokenProgram });
  return getTransferCheckedInstruction(
    {
      source: authorityAta,
      mint,
      destination: holding.ata as Address,
      authority,
      amount,
      decimals: holding.decimals,
    },
    { programAddress: tokenProgram },
  );
}
