import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { findEstatePda, findVaultPda } from "@historiah/heirloom";
import { type Address } from "@solana/kit";

export async function getEstateAddress(authority: Address, heir: Address): Promise<Address> {
  const [pda] = await findEstatePda({ authority, heir });
  return pda;
}

export async function getVaultAddress(authority: Address, heir: Address): Promise<Address> {
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

/** Resolve both estate and vault PDAs for a given authority+heir pair. */
export async function getEstateVaultPair(authority: Address, heir: Address) {
  const [estate, vault] = await Promise.all([
    getEstateAddress(authority, heir),
    getVaultAddress(authority, heir),
  ]);
  return { estate, vault };
}
