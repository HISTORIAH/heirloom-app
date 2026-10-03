import { address, type Address } from "@solana/kit";

import { TOKEN_2022_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from "@/constants/solana";
import { findAtaPda } from "@/lib/solana/ata";
import { parsedInfo, parsedTokenAccount, toBigInt } from "@/lib/solana/parsed";
import type { EstateRpc, MintMeta } from "@/types/program";

/** Decimals and owning token program of an SPL mint. */
export async function fetchMintMeta(rpc: EstateRpc, mint: Address): Promise<MintMeta> {
  const { value } = await rpc.getAccountInfo(mint, { encoding: "jsonParsed" }).send();
  if (!value) throw new Error("Mint not found");
  const tokenProgram = address(String(value.owner));
  if (tokenProgram !== TOKEN_PROGRAM_ADDRESS && tokenProgram !== TOKEN_2022_PROGRAM_ADDRESS) {
    throw new Error("That address is not an SPL mint");
  }
  const decimals = parsedInfo(value.data)?.decimals;
  if (typeof decimals !== "number") throw new Error("Could not read mint decimals");
  return { decimals, tokenProgram };
}

/** Throws unless `owner` holds at least `amount` of `mint`. */
export async function assertWalletCanDeposit(
  rpc: EstateRpc,
  owner: Address,
  mint: Address,
  tokenProgram: Address,
  amount: bigint,
): Promise<void> {
  const ata = await findAtaPda(owner, mint, tokenProgram);
  const { value } = await rpc.getAccountInfo(ata, { encoding: "jsonParsed" }).send();
  if (!value) throw new Error("This wallet has no token account for that mint.");
  const have = toBigInt(parsedTokenAccount(value.data)?.amount);
  if (have === undefined) throw new Error("Could not read this wallet's token balance.");
  if (have < amount) throw new Error("This wallet does not have that much of this token.");
}
