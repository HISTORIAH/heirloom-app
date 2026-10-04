import { address } from "@solana/kit";

import { DUST_USD } from "@/constants/estate";
import { SOL_ASSET_ID } from "@/constants/create";
import { SOL_LOGO_URL, SOL_DECIMALS } from "@/constants/solana";
import type { AssetSort } from "@/types/create";
import type { EstateHolding, TopUpAsset } from "@/types/estate";
import type { WalletToken } from "@/types/wallet";

/** SOL first, then every token the wallet holds, each with what the estate already has of it. */
export function topUpAssets(
  solHeld: bigint,
  wallet: WalletToken[],
  holdings: EstateHolding[],
): TopUpAsset[] {
  const inEstate = new Map(holdings.map((h) => [h.id, h]));
  const sol: TopUpAsset = {
    id: SOL_ASSET_ID,
    symbol: "SOL",
    name: "Solana",
    image: SOL_LOGO_URL,
    decimals: SOL_DECIMALS,
    held: solHeld,
    inEstate: inEstate.get(SOL_ASSET_ID)?.amount ?? 0n,
    registered: true,
    usd: null,
    named: true,
  };
  const tokens = wallet
    .filter((tok) => tok.raw > 0n)
    .map((tok): TopUpAsset => {
      const held = inEstate.get(tok.mint);
      return {
        id: tok.mint,
        mint: address(tok.mint),
        symbol: tok.symbol,
        name: tok.name,
        image: tok.image,
        decimals: tok.decimals,
        held: tok.raw,
        inEstate: held?.amount ?? 0n,
        registered: held !== undefined,
        usd: tok.usd,
        named: tok.named,
      };
    });
  return [sol, ...tokens];
}

/** Priced and worth less than DUST_USD. SOL and unpriced tokens never count as dust. */
export function isDust(asset: TopUpAsset): boolean {
  return asset.id !== SOL_ASSET_ID && asset.usd !== null && asset.usd < DUST_USD;
}

type Sortable = { id: string; usd: number | null; symbol: string; named: boolean; decimals: number };

/** Whole-token amount, for comparing balances across mints with different decimals. */
function wholeUnits(raw: bigint, decimals: number): number {
  return Number(raw) / 10 ** decimals;
}

/**
 * Comparator: SOL first, always.
 * value — priced by USD high to low, then unpriced by balance (most held first).
 * name  — named by symbol A–Z, then unknown tokens.
 * Ties fall back to symbol, then mint, so the order never jumps between renders.
 */
export function compareAssets<T extends Sortable>(sort: AssetSort, balance: (item: T) => bigint) {
  return (a: T, b: T): number => {
    if (a.id === SOL_ASSET_ID || b.id === SOL_ASSET_ID) {
      return a.id === b.id ? 0 : a.id === SOL_ASSET_ID ? -1 : 1;
    }
    if (sort === "value") {
      if (a.usd !== null && b.usd !== null && a.usd !== b.usd) return b.usd - a.usd;
      if (a.usd !== null && b.usd === null) return -1;
      if (a.usd === null && b.usd !== null) return 1;
      if (a.usd === null && b.usd === null) {
        const diff = wholeUnits(balance(b), b.decimals) - wholeUnits(balance(a), a.decimals);
        if (diff !== 0) return diff;
      }
    }
    if (a.named !== b.named) return a.named ? -1 : 1;
    return (
      a.symbol.localeCompare(b.symbol, undefined, { sensitivity: "base" }) ||
      a.id.localeCompare(b.id)
    );
  };
}

export function sortTopUpAssets(list: TopUpAsset[], sort: AssetSort): TopUpAsset[] {
  return [...list].sort(compareAssets<TopUpAsset>(sort, (item) => item.held));
}
