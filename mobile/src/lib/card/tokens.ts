import type { Address } from "@solana/kit";

import { NETWORK_FEE_LAMPORTS } from "@/constants/fees";
import { TOKEN_PROGRAMS } from "@/constants/solana";
import { safeAddress } from "@/lib/solana/address";
import { parsedTokenAccount, toBigInt } from "@/lib/solana/parsed";
import type { SweepToken } from "@/types/claim";
import type { EstateRpc } from "@/types/program";

/** Lamports we can send while leaving rent-exempt plus two fees for a retry. */
export function spareLamports(balance: bigint, rentExempt: bigint): bigint {
  const keep = rentExempt + NETWORK_FEE_LAMPORTS * 2n;
  return balance > keep ? balance - keep : 0n;
}

/** Every non-empty token account a credential holds, across Token and Token-2022. */
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
      if (
        tokenProgram === undefined ||
        mint === undefined ||
        amount === undefined ||
        amount <= 0n
      ) {
        continue;
      }
      if (decimals === undefined) continue;
      out.push({ mint, source: item.pubkey, tokenProgram, amount, decimals });
    }
  }
  return out;
}

/** The credential's spare SOL, after keeping rent and fees back. */
export async function fetchCardSpareLamports(rpc: EstateRpc, owner: Address): Promise<bigint> {
  const [bal, rent] = await Promise.all([
    rpc.getBalance(owner).send(),
    rpc.getMinimumBalanceForRentExemption(0n).send(),
  ]);
  return spareLamports(BigInt(bal.value), BigInt(rent));
}

export async function cardHasSweepable(rpc: EstateRpc, owner: Address): Promise<boolean> {
  const [spare, tokens] = await Promise.all([
    fetchCardSpareLamports(rpc, owner),
    discoverCardTokens(rpc, owner),
  ]);
  return tokens.length > 0 || spare > 0n;
}
