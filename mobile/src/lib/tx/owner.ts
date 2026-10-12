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
import { assertWalletCanDeposit, fetchMintMeta } from "@/lib/solana/mint";
import { floatDestinations } from "@/lib/tx/cardFloat";
import { buildRegisterTokenIx } from "@/lib/tx/manage";
import type { CreateEstateInput, CreateTokenDeposit, EstateRpc } from "@/types/program";

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
  rpc: EstateRpc,
  authority: TransactionSigner,
  input: CreateEstateInput,
  token: CreateTokenDeposit,
): Promise<Instruction> {
  const [{ tokenProgram }, [estate], [vault]] = await Promise.all([
    fetchMintMeta(rpc, token.mint),
    findEstatePda({ authority: authority.address, heir: input.heir }),
    findVaultPda({ authority: authority.address, heir: input.heir }),
  ]);
  await assertWalletCanDeposit(rpc, authority.address, token.mint, tokenProgram, token.amount);
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

export async function buildCreateEstateIxs(
  rpc: EstateRpc,
  authority: TransactionSigner,
  input: CreateEstateInput,
): Promise<Instruction[]> {
  const tokens = input.tokens ?? [];
  let initIx: Instruction;
  let extra: CreateTokenDeposit[];
  if (input.amountLamports > 0n) {
    initIx = await getInitializeInstructionAsync({
      ...timingAndPeople(authority, input),
      amount: input.amountLamports,
    });
    extra = tokens;
  } else {
    const primary = tokens[0];
    if (primary === undefined) throw new Error("Select at least one asset");
    initIx = await initializeWithFirstToken(rpc, authority, input, primary);
    extra = tokens.slice(1);
  }
  const registerIxs = await Promise.all(
    extra.map((tok) => buildRegisterTokenIx(rpc, authority, input.heir, tok.mint, tok.amount)),
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
