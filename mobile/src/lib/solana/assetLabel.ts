import { assetDisplay, type DasAsset } from "@heirloom/core/assets";

/**
 * Symbol, name and image for a mint. With neither a name nor a symbol from DAS, the token is
 * "Unknown token" and `named` is false.
 */
export function assetLabel(
  mint: string,
  asset: DasAsset | undefined,
): { symbol: string; name: string; named: boolean; image?: string } {
  const { name, symbol, image } = assetDisplay(asset);
  const shownName = name ?? symbol;
  return {
    symbol: symbol ?? mint.slice(0, 4),
    name: shownName ?? "Unknown token",
    named: shownName !== undefined,
    image,
  };
}
