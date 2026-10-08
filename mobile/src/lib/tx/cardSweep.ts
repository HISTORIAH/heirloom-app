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
import { address, type Address, type Instruction, type TransactionSigner } from "@solana/kit";

import { NETWORK_FEE_LAMPORTS } from "@/constants/fees";
import { TOKEN_PROGRAMS } from "@/constants/solana";
import { parsedTokenAccount, toBigInt } from "@/lib/solana/parsed";
import type { SweepToken } from "@/types/claim";
import type { EstateRpc } from "@/types/program";

function safeAddress(value: unknown): Address | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  try {
    return address(value);
  } catch {
    return undefined;
  }
}

/** Lamports we can send while leaving rent-exempt plus two fees for a retry. */
export function spareLamports(balance: bigint, rentExempt: bigint): bigint {
  const keep = rentExempt + NETWORK_FEE_LAMPORTS * 2n;
  return balance > keep ? balance - keep : 0n;
}

export async function discoverCardTokens(rpc: EstateRpc, owner: Address): Promise<SweepToken[]> {
  const groups = await Promise.all(
    TOKEN_PROGRAMS.map((programId) =>
      rpc.getTokenAccountsByOwner(owner, { programId }, { encoding: "jsonParsed" }).send(),
    ),
  );
  const out: SweepToken[] = [];
  for (const group of groups) {
    for (const item of group.value) {
      const parsed = parsedTokenAccount(item.account.data);
      const tokenProgram = safeAddress(item.account.owner);
      const mint = safeAddress(parsed?.mint);
      const amount = toBigInt(parsed?.amount);
      const decimals = parsed?.decimals;
      if (tokenProgram === undefined || mint === undefined || amount === undefined || amount <= 0n) {
        continue;
      }
      if (decimals === undefined) continue;
      out.push({ mint, source: item.pubkey, tokenProgram, amount, decimals });
    }
  }
  return out;
}

export async function cardHasSweepable(rpc: EstateRpc, owner: Address): Promise<boolean> {
  const [bal, tokens, rent] = await Promise.all([
    rpc.getBalance(owner).send(),
    discoverCardTokens(rpc, owner),
    rpc.getMinimumBalanceForRentExemption(0n).send(),
  ]);
  if (tokens.length > 0) return true;
  return spareLamports(BigInt(bal.value), BigInt(rent)) > 0n;
}

export async function buildTokenSweepIxs(
  signer: TransactionSigner,
  destination: Address,
  tokens: SweepToken[],
): Promise<Instruction[]> {
  const ixs: Instruction[] = [];
  for (const tok of tokens) {
    const [ata] = await findAssociatedTokenPda({
      owner: destination,
      mint: tok.mint,
      tokenProgram: tok.tokenProgram,
    });
    ixs.push(
      getCreateAssociatedTokenIdempotentInstruction({
        payer: signer,
        ata,
        owner: destination,
        mint: tok.mint,
        tokenProgram: tok.tokenProgram,
      }),
    );
    const transfer = {
      source: tok.source,
      mint: tok.mint,
      destination: ata,
      authority: signer,
      amount: tok.amount,
      decimals: tok.decimals,
    };
    ixs.push(
      tok.tokenProgram === TOKEN_2022_PROGRAM_ADDRESS
        ? getTransferChecked2022Instruction(transfer)
        : getTransferCheckedInstruction(transfer),
    );
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
