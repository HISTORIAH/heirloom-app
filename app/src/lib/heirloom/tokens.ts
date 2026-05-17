import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { type Address } from "@solana/kit";
import type { HeirloomClient } from "./client";

const TOKEN_2022_PROGRAM_ADDRESS =
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as Address;

export interface VaultTokenInfo {
  mint: string;
  address: string;
  amount: bigint;
  decimals: number;
  tokenProgram: string;
}

/**
 * Discover all token accounts owned by a vault PDA.
 * Queries both legacy Token Program and Token-2022.
 */
export async function discoverVaultTokenAccounts(
  client: HeirloomClient,
  vaultPda: Address,
): Promise<VaultTokenInfo[]> {
  const [legacyResult, token2022Result] = await Promise.all([
    client.rpc
      .getTokenAccountsByOwner(vaultPda, { programId: TOKEN_PROGRAM_ADDRESS }, { encoding: "jsonParsed" })
      .send(),
    client.rpc
      .getTokenAccountsByOwner(
        vaultPda,
        { programId: TOKEN_2022_PROGRAM_ADDRESS },
        { encoding: "jsonParsed" },
      )
      .send(),
  ]);

  const tokens: VaultTokenInfo[] = [];

  for (const item of legacyResult.value) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = (item.account.data as any)?.parsed;
    if (!parsed?.info) continue;
    const info = parsed.info;
    const rawAmount = info.tokenAmount?.amount;
    if (!rawAmount || rawAmount === "0") continue;
    tokens.push({
      mint: info.mint,
      address: item.pubkey,
      amount: BigInt(rawAmount),
      decimals: info.tokenAmount?.decimals ?? 0,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
  }

  for (const item of token2022Result.value) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = (item.account.data as any)?.parsed;
    if (!parsed?.info) continue;
    const info = parsed.info;
    const rawAmount = info.tokenAmount?.amount;
    if (!rawAmount || rawAmount === "0") continue;
    tokens.push({
      mint: info.mint,
      address: item.pubkey,
      amount: BigInt(rawAmount),
      decimals: info.tokenAmount?.decimals ?? 0,
      tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    });
  }

  return tokens;
}
