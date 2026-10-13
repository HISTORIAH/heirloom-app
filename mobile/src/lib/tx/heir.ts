import { findVaultPda, getClaimInstructionAsync, TREASURY_ADDRESS } from "@historiah/heirloom";
import { findAssociatedTokenPda } from "@solana-program/token";
import type { Instruction, TransactionSigner } from "@solana/kit";

import { estateDelegate } from "@/lib/estate/tokens";
import type { EstateRow, VaultToken } from "@/types/program";

/** Claim every token in `tokens`, then SOL, into the heir's wallet. */
export async function buildClaimIxs(
  heir: TransactionSigner,
  row: EstateRow,
  tokens: VaultToken[],
): Promise<Instruction[]> {
  const authority = row.data.authority;
  const estate = row.address;
  const delegate = estateDelegate(row.data);
  const [vault] = await findVaultPda({ authority, heir: heir.address });
  const tokenIxs = await Promise.all(
    tokens.map(async (tok) => {
      const [[heirTokenAccount], [treasuryTokenAccount]] = await Promise.all([
        findAssociatedTokenPda({ owner: heir.address, mint: tok.mint, tokenProgram: tok.tokenProgram }),
        findAssociatedTokenPda({ owner: TREASURY_ADDRESS, mint: tok.mint, tokenProgram: tok.tokenProgram }),
      ]);
      return getClaimInstructionAsync({
        heir,
        authority,
        estate,
        vault,
        treasury: TREASURY_ADDRESS,
        mint: tok.mint,
        tokenProgram: tok.tokenProgram,
        vaultTokenAccount: tok.vaultTokenAccount,
        heirTokenAccount,
        treasuryTokenAccount,
        assetRecord: tok.assetRecord,
        delegate,
      });
    }),
  );
  const solIx = await getClaimInstructionAsync({
    heir,
    authority,
    estate,
    vault,
    treasury: TREASURY_ADDRESS,
    delegate,
  });
  return [...tokenIxs, solIx];
}
