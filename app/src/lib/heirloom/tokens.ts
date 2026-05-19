import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { type Address, address as toAddress } from "@solana/kit";
import { fetchAssetsByOwner } from "@/lib/heliusDas";
import { SOLANA_RPC_ENDPOINT } from "@/config";
import type { VaultTokenHolding } from "@/types";

export type { VaultTokenHolding };

export async function discoverVaultTokenAccounts(
  vaultPda: Address,
): Promise<VaultTokenHolding[]> {
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
