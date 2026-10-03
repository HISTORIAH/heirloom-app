import { findVaultPda, getInitializeInstructionAsync } from "@historiah/heirloom";
import { getAddMemoInstruction } from "@solana-program/memo";
import type { Address, Instruction, TransactionSigner } from "@solana/kit";

import { CARD_FEE_FLOAT_LAMPORTS } from "@/constants/fees";
import { transferSolIx } from "@/lib/solana/transfer";
import { floatDestinations } from "@/lib/tx/cardFloat";
import type { CreateEstateInput } from "@/types/program";

export async function buildCreateEstateIxs(
  authority: TransactionSigner,
  input: CreateEstateInput,
): Promise<Instruction[]> {
  const initIx = await getInitializeInstructionAsync({
    authority,
    heir: input.heir,
    amount: input.amountLamports,
    checkInIntervalSecs: input.checkInIntervalSecs,
    gracePeriodSecs: input.gracePeriodSecs,
    delegatePauseDurationSecs: input.delegatePauseDurationSecs ?? 0n,
    delegate: input.delegate,
    checkInSigner: input.checkInSigner,
  });
  const floatIxs = floatDestinations(input).map((destination) =>
    transferSolIx(authority, destination, CARD_FEE_FLOAT_LAMPORTS),
  );
  // Backend only reads the first memo, so there must be at most one.
  const label = input.label.trim();
  const memoIxs = label.length > 0 ? [getAddMemoInstruction({ memo: label })] : [];
  return [initIx, ...floatIxs, ...memoIxs];
}

export async function buildTopUpSolIx(
  authority: TransactionSigner,
  heir: Address,
  lamports: bigint,
): Promise<Instruction> {
  if (lamports <= 0n) throw new Error("Enter a SOL amount");
  const [vault] = await findVaultPda({ authority: authority.address, heir });
  return transferSolIx(authority, vault, lamports);
}
