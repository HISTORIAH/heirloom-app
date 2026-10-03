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

import { assertEstateFree, assertMintUnregistered, assertNotPaused } from "@/lib/estate/guards";
import { assertAllTokensListed, discoverVaultRegisteredTokens } from "@/lib/estate/tokens";
import { assertWalletCanDeposit, fetchMintMeta } from "@/lib/solana/mint";
import type { EstateRow, EstateRpc } from "@/types/program";

/** Close the estate: every token, then SOL, back to the owner. */
export async function buildRevokeAllIxs(
  rpc: EstateRpc,
  authority: TransactionSigner,
  row: EstateRow,
): Promise<Instruction[]> {
  const heir = row.data.heir;
  const [vault] = await findVaultPda({
    authority: authority.address,
    heir,
  });
  const tokens = await discoverVaultRegisteredTokens(rpc, vault, row.address);
  assertAllTokensListed(tokens.length, row.data.claimableAssets);
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

/** Move the estate, tokens and all, to a new heir. */
export async function buildReassignIxs(
  rpc: EstateRpc,
  authority: TransactionSigner,
  row: EstateRow,
  newHeir: Address,
): Promise<Instruction[]> {
  if (newHeir === row.data.heir) {
    throw new Error("That address is already the heir.");
  }
  assertNotPaused(row.data.delegatePauseExpiresAt);
  await assertEstateFree(rpc, authority.address, newHeir);
  const heir = row.data.heir;
  const [[estate], [vault], [newEstate], [newVault]] = await Promise.all([
    findEstatePda({ authority: authority.address, heir }),
    findVaultPda({ authority: authority.address, heir }),
    findEstatePda({ authority: authority.address, heir: newHeir }),
    findVaultPda({ authority: authority.address, heir: newHeir }),
  ]);
  const tokens = await discoverVaultRegisteredTokens(rpc, vault, estate);
  assertAllTokensListed(tokens.length, row.data.claimableAssets);
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
  rpc: EstateRpc,
  authority: TransactionSigner,
  heir: Address,
  mint: Address,
  amount: bigint,
): Promise<Instruction> {
  if (amount <= 0n) throw new Error("Enter an amount greater than zero");
  const [{ tokenProgram }, [estate], [vault]] = await Promise.all([
    fetchMintMeta(rpc, mint),
    findEstatePda({ authority: authority.address, heir }),
    findVaultPda({ authority: authority.address, heir }),
  ]);
  await assertMintUnregistered(rpc, estate, mint);
  await assertWalletCanDeposit(rpc, authority.address, mint, tokenProgram, amount);
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
