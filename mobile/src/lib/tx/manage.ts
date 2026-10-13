import {
  findAssetRecordPda,
  findEstatePda,
  findVaultPda,
  getRegisterAssetInstructionAsync,
  getRevokeInstructionAsync,
  getUpdateHeirInstructionAsync,
  TREASURY_ADDRESS,
} from "@historiah/heirloom";
import { findAssociatedTokenPda } from "@solana-program/token";
import type { Address, Instruction, TransactionSigner } from "@solana/kit";

import type { EstateRow, TokenDeposit, VaultToken } from "@/types/program";

/** Close the estate: every token in `tokens`, then SOL, back to the owner. */
export async function buildRevokeAllIxs(
  authority: TransactionSigner,
  row: EstateRow,
  tokens: VaultToken[],
): Promise<Instruction[]> {
  const heir = row.data.heir;
  const [vault] = await findVaultPda({
    authority: authority.address,
    heir,
  });
  const tokenIxs = await Promise.all(
    tokens.map(async (tok) => {
      const [[authorityTokenAccount], [treasuryTokenAccount]] = await Promise.all([
        findAssociatedTokenPda({ owner: authority.address, mint: tok.mint, tokenProgram: tok.tokenProgram }),
        findAssociatedTokenPda({ owner: TREASURY_ADDRESS, mint: tok.mint, tokenProgram: tok.tokenProgram }),
      ]);
      return getRevokeInstructionAsync({
        authority,
        heir,
        estate: row.address,
        vault,
        treasury: TREASURY_ADDRESS,
        mint: tok.mint,
        tokenProgram: tok.tokenProgram,
        vaultTokenAccount: tok.vaultTokenAccount,
        authorityTokenAccount,
        treasuryTokenAccount,
        assetRecord: tok.assetRecord,
      });
    }),
  );
  const solIx = await getRevokeInstructionAsync({
    authority,
    heir,
    estate: row.address,
    vault,
    treasury: TREASURY_ADDRESS,
  });
  return [...tokenIxs, solIx];
}

/** Move the estate, every token in `tokens` included, to a new heir. */
export async function buildReassignIxs(
  authority: TransactionSigner,
  row: EstateRow,
  newHeir: Address,
  tokens: VaultToken[],
): Promise<Instruction[]> {
  const heir = row.data.heir;
  const [[estate], [vault], [newEstate], [newVault]] = await Promise.all([
    findEstatePda({ authority: authority.address, heir }),
    findVaultPda({ authority: authority.address, heir }),
    findEstatePda({ authority: authority.address, heir: newHeir }),
    findVaultPda({ authority: authority.address, heir: newHeir }),
  ]);
  const tokenIxs = await Promise.all(
    tokens.map(async (tok) => {
      const [[newVaultTokenAccount], newAssetRecord] = await Promise.all([
        findAssociatedTokenPda({ owner: newVault, mint: tok.mint, tokenProgram: tok.tokenProgram }),
        findAssetRecordPda({ estate: newEstate, mint: tok.mint }),
      ]);
      return getUpdateHeirInstructionAsync({
        authority,
        heir,
        newHeir,
        estate,
        vault,
        newEstate,
        newVault,
        mint: tok.mint,
        tokenProgram: tok.tokenProgram,
        vaultTokenAccount: tok.vaultTokenAccount,
        newVaultTokenAccount,
        assetRecord: tok.assetRecord,
        newAssetRecord: newAssetRecord[0],
      });
    }),
  );
  const finalIx = await getUpdateHeirInstructionAsync({
    authority,
    heir,
    newHeir,
    estate,
    vault,
    newEstate,
    newVault,
  });
  return [...tokenIxs, finalIx];
}

/** Add a new token mint to the estate. */
export async function buildRegisterTokenIx(
  authority: TransactionSigner,
  heir: Address,
  token: TokenDeposit,
): Promise<Instruction> {
  const { mint, amount, tokenProgram } = token;
  const [[estate], [vault]] = await Promise.all([
    findEstatePda({ authority: authority.address, heir }),
    findVaultPda({ authority: authority.address, heir }),
  ]);
  const [[vaultTokenAccount], [authorityTokenAccount], [assetRecord]] = await Promise.all([
    findAssociatedTokenPda({ owner: vault, mint, tokenProgram }),
    findAssociatedTokenPda({ owner: authority.address, mint, tokenProgram }),
    findAssetRecordPda({ estate, mint }),
  ]);
  return getRegisterAssetInstructionAsync({
    authority,
    heir,
    estate,
    vault,
    mint,
    amount,
    tokenProgram,
    vaultTokenAccount,
    authorityTokenAccount,
    assetRecord,
  });
}
