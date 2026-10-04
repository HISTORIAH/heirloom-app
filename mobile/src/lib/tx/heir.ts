import { getClaimInstructionAsync, TREASURY_ADDRESS } from "@historiah/heirloom";
import type { Address, Instruction, TransactionSigner } from "@solana/kit";

import type { ClaimToken } from "@/types/program";

/** Claim every token, then SOL, into the heir's wallet. */
export async function buildClaimIxs(
  heir: TransactionSigner,
  input: {
    authority: Address;
    estate: Address;
    vault: Address;
    tokens: ClaimToken[];
    delegate?: Address;
  },
): Promise<Instruction[]> {
  const tokenIxs = await Promise.all(
    input.tokens.map((tok) =>
      getClaimInstructionAsync({
        heir,
        authority: input.authority,
        estate: input.estate,
        vault: input.vault,
        treasury: TREASURY_ADDRESS,
        mint: tok.mint,
        tokenProgram: tok.tokenProgram,
        vaultTokenAccount: tok.vaultTokenAccount,
        heirTokenAccount: tok.heirTokenAccount,
        treasuryTokenAccount: tok.treasuryTokenAccount,
        assetRecord: tok.assetRecord,
        delegate: input.delegate,
      }),
    ),
  );
  const solIx = await getClaimInstructionAsync({
    heir,
    authority: input.authority,
    estate: input.estate,
    vault: input.vault,
    treasury: TREASURY_ADDRESS,
    delegate: input.delegate,
  });
  return [...tokenIxs, solIx];
}
