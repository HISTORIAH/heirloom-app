import {
  findAssetRecordPda,
  findEstatePda,
  findVaultPda,
  getInitializeInstructionAsync,
} from "@historiah/heirloom";
import { getAddMemoInstruction } from "@solana-program/memo";
import { getTransferSolInstruction } from "@solana-program/system";
import { findAssociatedTokenPda, getTransferCheckedInstruction } from "@solana-program/token";
import {
  getTransferCheckedInstruction as getTransferChecked2022Instruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import type { Address, Instruction, TransactionSigner } from "@solana/kit";

import { CARD_FEE_FLOAT_LAMPORTS } from "@/constants/fees";
import { floatDestinations } from "@/lib/tx/cardFloat";
import { buildRegisterTokenIx } from "@/lib/tx/manage";
import type { CreateEstateInput, TokenDeposit } from "@/types/program";

function timingAndPeople(authority: TransactionSigner, input: CreateEstateInput) {
  return {
    authority,
    heir: input.heir,
    checkInIntervalSecs: input.checkInIntervalSecs,
    gracePeriodSecs: input.gracePeriodSecs,
    delegatePauseDurationSecs: input.delegatePauseDurationSecs ?? 0n,
    delegate: input.delegate,
    checkInSigner: input.checkInSigner,
  };
}

/** Token-only create: `amount` is token units, and initialize opens the vault ATA. */
async function initializeWithFirstToken(
  authority: TransactionSigner,
  input: CreateEstateInput,
  token: TokenDeposit,
): Promise<Instruction> {
  const { tokenProgram } = token;
  const [[estate], [vault]] = await Promise.all([
    findEstatePda({ authority: authority.address, heir: input.heir }),
    findVaultPda({ authority: authority.address, heir: input.heir }),
  ]);
  const [[authorityTokenAccount], [vaultTokenAccount], [assetRecord]] = await Promise.all([
    findAssociatedTokenPda({ owner: authority.address, mint: token.mint, tokenProgram }),
    findAssociatedTokenPda({ owner: vault, mint: token.mint, tokenProgram }),
    findAssetRecordPda({ estate, mint: token.mint }),
  ]);
  return getInitializeInstructionAsync({
    ...timingAndPeople(authority, input),
    amount: token.amount,
    mint: token.mint,
    tokenProgram,
    authorityTokenAccount,
    vaultTokenAccount,
    assetRecord,
  });
}

/** `tokens` are `input.tokens` with each mint's program and decimals already read. */
export async function buildCreateEstateIxs(
  authority: TransactionSigner,
  input: CreateEstateInput,
  tokens: TokenDeposit[],
): Promise<Instruction[]> {
  let initIx: Instruction;
  let extra: TokenDeposit[];
  if (input.amountLamports > 0n) {
    initIx = await getInitializeInstructionAsync({
      ...timingAndPeople(authority, input),
      amount: input.amountLamports,
    });
    extra = tokens;
  } else {
    const primary = tokens[0];
    if (primary === undefined) throw new Error("Select at least one asset");
    initIx = await initializeWithFirstToken(authority, input, primary);
    extra = tokens.slice(1);
  }
  const registerIxs = await Promise.all(
    extra.map((tok) => buildRegisterTokenIx(authority, input.heir, tok)),
  );

  const floatIxs = floatDestinations(input).map((destination) =>
    getTransferSolInstruction({ source: authority, destination, amount: CARD_FEE_FLOAT_LAMPORTS }),
  );
  // Backend only reads the first memo, so there must be at most one.
  const label = input.label.trim();
  const memoIxs = label.length > 0 ? [getAddMemoInstruction({ memo: label })] : [];
  return [initIx, ...registerIxs, ...floatIxs, ...memoIxs];
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
  authority: TransactionSigner,
  heir: Address,
  token: TokenDeposit,
): Promise<Instruction> {
  const { mint, amount, decimals, tokenProgram } = token;
  const [vault] = await findVaultPda({ authority: authority.address, heir });
  const [[source], [destination]] = await Promise.all([
    findAssociatedTokenPda({ owner: authority.address, mint, tokenProgram }),
    findAssociatedTokenPda({ owner: vault, mint, tokenProgram }),
  ]);
  const input = { source, mint, destination, authority, amount, decimals };
  // The program comes from fetchMintMeta, so it is Token or Token-2022; use that program's own builder.
  return tokenProgram === TOKEN_2022_PROGRAM_ADDRESS
    ? getTransferChecked2022Instruction(input)
    : getTransferCheckedInstruction(input);
}
