import { fetchAssetsByMint, type DasAsset } from "@heirloom/core/assets";
import { findVaultPda } from "@historiah/heirloom";

import { DAS_RPC_URL } from "@/config";
import { WSOL_MINT } from "@/constants/solana";
import { discoverVaultRegisteredTokens } from "@/lib/estate/tokens";
import { assetLabel } from "@/lib/solana/assetLabel";
import type { EstateHolding } from "@/types/estate";
import type { EstateRow, EstateRpc } from "@/types/program";

/** Registered vault tokens with DAS names and prices, plus the SOL price. */
export async function fetchVaultHoldings(
  rpc: EstateRpc,
  row: EstateRow,
  signal: AbortSignal,
): Promise<{ tokens: EstateHolding[]; solUsd: number | null }> {
  const [vault] = await findVaultPda({ authority: row.data.authority, heir: row.data.heir });
  const tokens = await discoverVaultRegisteredTokens(rpc, vault, row.address);
  // Metadata is nice to have: an RPC without DAS still lists the tokens, unnamed.
  const meta = await fetchAssetsByMint(
    DAS_RPC_URL,
    [WSOL_MINT, ...tokens.map((tok) => tok.mint)],
    signal,
  ).catch(() => new Map<string, DasAsset>());
  return {
    solUsd: meta.get(WSOL_MINT)?.token_info?.price_info?.price_per_token ?? null,
    tokens: tokens.map((tok) => {
      const asset = meta.get(tok.mint);
      const { symbol, name, named, image } = assetLabel(tok.mint, asset);
      const price = asset?.token_info?.price_info?.price_per_token;
      return {
        id: tok.mint,
        mint: tok.mint,
        symbol,
        name,
        image,
        decimals: tok.decimals,
        amount: tok.amount,
        usd: price === undefined ? null : (Number(tok.amount) / 10 ** tok.decimals) * price,
        named,
        vaultToken: tok,
      };
    }),
  };
}
