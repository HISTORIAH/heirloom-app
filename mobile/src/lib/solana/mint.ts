import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022";
import { address, type Address } from "@solana/kit";

import { parsedInfo } from "@/lib/solana/parsed";
import type { EstateRpc, MintMeta, PickedDeposit, TokenDeposit } from "@/types/program";

export function isTokenProgram(value: string): boolean {
  return value === TOKEN_PROGRAM_ADDRESS || value === TOKEN_2022_PROGRAM_ADDRESS;
}

/** Decimals and owning token program of an SPL mint, read from chain. */
export async function fetchMintMeta(rpc: EstateRpc, mint: Address): Promise<MintMeta> {
  const { value } = await rpc.getAccountInfo(mint, { encoding: "jsonParsed" }).send();
  if (!value) throw new Error("Mint not found");
  const tokenProgram = address(String(value.owner));
  if (!isTokenProgram(tokenProgram)) {
    throw new Error("That address is not an SPL mint");
  }
  const decimals = parsedInfo(value.data)?.decimals;
  if (typeof decimals !== "number") throw new Error("Could not read mint decimals");
  return { decimals, tokenProgram };
}

/**
 * A picked deposit ready to build with. DAS already gave us the decimals and, almost always,
 * the program; only when it left the program out do we read the mint from chain.
 */
export async function toTokenDeposit(rpc: EstateRpc, picked: PickedDeposit): Promise<TokenDeposit> {
  if (picked.amount <= 0n) throw new Error("Enter an amount greater than zero");
  const { mint, amount, decimals, tokenProgram } = picked;
  if (tokenProgram !== undefined) return { mint, amount, decimals, tokenProgram };
  return { mint, amount, ...(await fetchMintMeta(rpc, mint)) };
}
