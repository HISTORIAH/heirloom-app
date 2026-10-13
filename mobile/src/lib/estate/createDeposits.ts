import { SOL_ASSET_ID } from "@/constants/create";
import { parseAddress } from "@/lib/solana/address";
import { solToLamports, uiAmountToRaw } from "@/lib/solana/amount";
import type { CreateWalletMint } from "@/types/create";
import type { PickedDeposit } from "@/types/program";

export function parseCreateDeposits(
  amounts: Record<string, string>,
  walletTokens: CreateWalletMint[],
): { amountLamports: bigint; tokens: PickedDeposit[] } {
  const byMint = new Map(walletTokens.map((tok) => [tok.mint, tok]));
  let amountLamports = 0n;
  const tokens: PickedDeposit[] = [];
  for (const [id, text] of Object.entries(amounts)) {
    if (text.trim().length === 0) continue;
    if (id === SOL_ASSET_ID) {
      amountLamports = solToLamports(text);
      continue;
    }
    const meta = byMint.get(id);
    if (meta === undefined) throw new Error("That token is no longer in this wallet.");
    const amount = uiAmountToRaw(text, meta.decimals);
    if (amount <= 0n) throw new Error("Enter an amount greater than zero");
    if (amount > meta.raw) throw new Error("This wallet does not have that much of this token.");
    tokens.push({ mint: parseAddress(id, "token"), amount, decimals: meta.decimals, tokenProgram: meta.tokenProgram });
  }
  return { amountLamports, tokens };
}

export function formatCreateAssetsLine(
  amounts: Record<string, string>,
  assets: { id: string; symbol: string }[],
): string {
  const parts = assets.flatMap((asset) => {
    const text = (amounts[asset.id] ?? "").trim();
    return text.length > 0 ? [`${text} ${asset.symbol}`] : [];
  });
  return parts.length === 0 ? "nothing yet" : parts.join(" · ");
}
