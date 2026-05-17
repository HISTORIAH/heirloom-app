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
