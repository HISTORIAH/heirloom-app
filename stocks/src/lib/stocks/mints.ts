import { unwrapOption, type Address, type GetAccountInfoApi, type Rpc } from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { fetchMint, TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022";

/** What every instruction builder needs to know about a mint. */
export type StockAsset = {
  mint: Address;
  /**
   * The program that owns the mint. Every major equity issuer uses Token-2022,
   * but the generated client defaults to the original token program, so this
   * is always read from the chain and passed explicitly — never assumed.
   */
  tokenProgram: Address;
  /** Raw decimals. Dividends move a display multiplier, never this. */
  decimals: number;
  /** The key the issuer registry is keyed by. Null if the issuer revoked it. */
  mintAuthority: Address | null;
};

export class UnsupportedMintError extends Error {
  constructor(mint: Address, owner: Address) {
    super(`${mint} is owned by ${owner}, not a token program`);
    this.name = "UnsupportedMintError";
  }
}

export async function fetchStockAsset(
  rpc: Rpc<GetAccountInfoApi>,
  mint: Address,
): Promise<StockAsset> {
  const account = await fetchMint(rpc, mint);
  const tokenProgram = account.programAddress;

  if (tokenProgram !== TOKEN_PROGRAM_ADDRESS && tokenProgram !== TOKEN_2022_PROGRAM_ADDRESS) {
    throw new UnsupportedMintError(mint, tokenProgram);
  }

  return {
    mint,
    tokenProgram,
    decimals: account.data.decimals,
    mintAuthority: unwrapOption(account.data.mintAuthority),
  };
}
