import { HELIUS_DAS_URL } from "@/config";
import { SOL_ASSET_ID } from "@/constants/create";
import { SOL_DECIMALS, SOL_LOGO_URL, WSOL_MINT } from "@/constants/solana";
import { discoverCardTokens } from "@/lib/tx/cardSweep";
import { fetchAssetBatch, pickImage, pickLabel } from "@/services/api/das";
import type { CardHolding } from "@/types/claim";
import type { Address } from "@solana/kit";
import type { EstateRpc } from "@/types/program";

export async function fetchCardHoldings(
  rpc: EstateRpc,
  owner: Address,
  signal: AbortSignal,
): Promise<{ holdings: CardHolding[]; solLamports: bigint }> {
  const [bal, tokens] = await Promise.all([
    rpc.getBalance(owner).send(),
    discoverCardTokens(rpc, owner),
  ]);
  const meta = await fetchAssetBatch(
    HELIUS_DAS_URL,
    [WSOL_MINT, ...tokens.map((tok) => tok.mint)],
    signal,
  ).catch(() => new Map());
  const solUsd = meta.get(WSOL_MINT)?.token_info?.price_info?.price_per_token ?? null;
  const solLamports = BigInt(bal.value);
  const sol: CardHolding = {
    id: SOL_ASSET_ID,
    symbol: "SOL",
    name: "Solana",
    image: SOL_LOGO_URL,
    decimals: SOL_DECIMALS,
    amount: solLamports,
    usd: solUsd === null ? null : (Number(solLamports) / 10 ** SOL_DECIMALS) * solUsd,
    named: true,
  };
  const named: CardHolding[] = tokens.map((tok) => {
    const asset = meta.get(tok.mint);
    const { symbol, name, named: hasName } = pickLabel(
      tok.mint,
      asset?.token_info?.symbol,
      asset?.content,
    );
    const price = asset?.token_info?.price_info?.price_per_token;
    return {
      id: tok.mint,
      mint: tok.mint,
      token: tok,
      symbol,
      name,
      image: pickImage(asset?.content),
      decimals: tok.decimals,
      amount: tok.amount,
      usd: price === undefined ? null : (Number(tok.amount) / 10 ** tok.decimals) * price,
      named: hasName,
    };
  });
  return { holdings: [sol, ...named], solLamports };
}
