import type { DasAsset, UnsupportedAssetReason } from "../types/assets";

function isCompressed(asset: DasAsset): boolean {
  return asset.compression?.compressed ?? false;
}

/** The token balance DAS reported, or undefined when it sent none (Core assets, cNFTs). */
function reportedBalance(asset: DasAsset): bigint | undefined {
  const balance = asset.token_info?.balance;
  return balance === undefined ? undefined : BigInt(balance);
}

/** V1_NFT, ProgrammableNFT, Core assets and cNFTs, plus any lone token with no decimals. */
export function isNftAsset(asset: DasAsset): boolean {
  if (isCompressed(asset) || asset.interface === "MplCoreAsset") return true;
  if (asset.interface?.includes("NFT")) return true;
  return asset.token_info?.decimals === 0 && reportedBalance(asset) === 1n;
}

/**
 * The vault holds plain SPL token accounts it can transfer out of. Compressed NFTs and Core
 * assets have no token account, pNFTs sit in a locked one, and frozen accounts can't move.
 */
export function unsupportedReason(asset: DasAsset): UnsupportedAssetReason | undefined {
  if (isCompressed(asset)) return "compressed";
  if (asset.interface === "MplCoreAsset") return "core";
  if (asset.interface === "ProgrammableNFT") return "programmable";
  if (asset.ownership?.frozen) return "frozen";
  return undefined;
}

/**
 * Raw units the owner holds. Core assets and cNFTs carry no token info, but DAS only returns
 * what the owner holds, so an NFT without a balance is still one item.
 */
export function heldAmount(asset: DasAsset): bigint {
  if (asset.burnt) return 0n;
  return reportedBalance(asset) ?? (isNftAsset(asset) ? 1n : 0n);
}
