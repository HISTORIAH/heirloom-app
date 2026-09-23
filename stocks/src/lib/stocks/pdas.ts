import {
  findBackupPlanPda,
  findCoveredAssetPda,
  findIssuerPda,
  findVaultPlanPda,
} from "@historiah/heirloom-stocks";
import { findAssociatedTokenPda } from "@solana-program/token-2022";
import type { Address } from "@solana/kit";

/**
 * Which of an owner's two plans. The mode is part of the plan's seeds, so one
 * owner can hold a backup plan and a vault plan at the same time.
 */
export type PlanMode = "backup" | "vault";

export async function getPlanAddress(owner: Address, mode: PlanMode): Promise<Address> {
  const [pda] =
    mode === "backup" ? await findBackupPlanPda({ owner }) : await findVaultPlanPda({ owner });
  return pda;
}

export async function getCoveredAssetAddress(plan: Address, mint: Address): Promise<Address> {
  const [pda] = await findCoveredAssetPda({ plan, mint });
  return pda;
}

/** Registry entries are keyed by an issuer's mint authority, not by mint. */
export async function getIssuerAddress(mintAuthority: Address): Promise<Address> {
  const [pda] = await findIssuerPda({ mintAuthority });
  return pda;
}

/**
 * The associated token account of `owner` for `mint`. The token program is
 * part of the derivation and deliberately has no default: guessing wrong
 * yields a valid-looking address that no one owns.
 */
export async function getAtaAddress(
  owner: Address,
  mint: Address,
  tokenProgram: Address,
): Promise<Address> {
  const [ata] = await findAssociatedTokenPda({ owner, mint, tokenProgram });
  return ata;
}
