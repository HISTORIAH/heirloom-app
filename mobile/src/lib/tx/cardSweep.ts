import { getTransferSolInstruction } from "@solana-program/system";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
} from "@solana-program/token";
import {
  getTransferCheckedInstruction as getTransferChecked2022Instruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import type { Address, Instruction, TransactionSigner } from "@solana/kit";

import type { SweepToken } from "@/types/claim";

export async function buildTokenTransferIxs(
  signer: TransactionSigner,
  destination: Address,
  tok: SweepToken,
  amount: bigint,
): Promise<Instruction[]> {
  if (amount <= 0n) return [];
  if (amount > tok.amount) throw new Error("That is more than the card holds.");
  const [ata] = await findAssociatedTokenPda({
    owner: destination,
    mint: tok.mint,
    tokenProgram: tok.tokenProgram,
  });
  const transfer = {
    source: tok.source,
    mint: tok.mint,
    destination: ata,
    authority: signer,
    amount,
    decimals: tok.decimals,
  };
  return [
    getCreateAssociatedTokenIdempotentInstruction({
      payer: signer,
      ata,
      owner: destination,
      mint: tok.mint,
      tokenProgram: tok.tokenProgram,
    }),
    tok.tokenProgram === TOKEN_2022_PROGRAM_ADDRESS
      ? getTransferChecked2022Instruction(transfer)
      : getTransferCheckedInstruction(transfer),
  ];
}

export async function buildTokenSweepIxs(
  signer: TransactionSigner,
  destination: Address,
  tokens: SweepToken[],
): Promise<Instruction[]> {
  const ixs: Instruction[] = [];
  for (const tok of tokens) {
    ixs.push(...(await buildTokenTransferIxs(signer, destination, tok, tok.amount)));
  }
  return ixs;
}

export function buildSolSweepIx(
  source: TransactionSigner,
  destination: Address,
  lamports: bigint,
): Instruction | undefined {
  if (lamports <= 0n) return undefined;
  return getTransferSolInstruction({ source, destination, amount: lamports });
}
