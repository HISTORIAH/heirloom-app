import { findVaultPda, getInitializeInstructionAsync } from "@historiah/heirloom";
import { getAddMemoInstruction } from "@solana-program/memo";
import { getTransferSolInstruction } from "@solana-program/system";
import { findAssociatedTokenPda, getTransferCheckedInstruction } from "@solana-program/token";
import {
  getTransferCheckedInstruction as getTransferChecked2022Instruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import type { Address, Instruction, TransactionSigner } from "@solana/kit";

import { CARD_FEE_FLOAT_LAMPORTS } from "@/constants/fees";
import { assertWalletCanDeposit, fetchMintMeta } from "@/lib/solana/mint";
import { floatDestinations } from "@/lib/tx/cardFloat";
import type { CreateEstateInput, EstateRpc } from "@/types/program";

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
    getTransferSolInstruction({ source: authority, destination, amount: CARD_FEE_FLOAT_LAMPORTS }),
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
  return getTransferSolInstruction({ source: authority, destination: vault, amount: lamports });
}

/** Top up a token already registered on the estate: a plain transfer into the vault ATA. */
export async function buildTopUpTokenIx(
  rpc: EstateRpc,
  authority: TransactionSigner,
  heir: Address,
  mint: Address,
  amount: bigint,
): Promise<Instruction> {
  if (amount <= 0n) throw new Error("Enter an amount greater than zero");
  const [{ decimals, tokenProgram }, [vault]] = await Promise.all([
    fetchMintMeta(rpc, mint),
    findVaultPda({ authority: authority.address, heir }),
  ]);
  await assertWalletCanDeposit(rpc, authority.address, mint, tokenProgram, amount);
  const [[source], [destination]] = await Promise.all([
    findAssociatedTokenPda({ owner: authority.address, mint, tokenProgram }),
    findAssociatedTokenPda({ owner: vault, mint, tokenProgram }),
  ]);
  const input = { source, mint, destination, authority, amount, decimals };
  // fetchMintMeta only returns Token or Token-2022; use that program's own builder.
  return tokenProgram === TOKEN_2022_PROGRAM_ADDRESS
    ? getTransferChecked2022Instruction(input)
    : getTransferCheckedInstruction(input);
}
