import type { DasAsset, UnsupportedAssetReason } from "../types/assets";

function isCompressed(asset: DasAsset): boolean {
  return asset.compression?.compressed ?? false;
}

/** The token balance DAS reported, or undefined when it sent none (Core assets, cNFTs). */
function reportedBalance(asset: DasAsset): bigint | undefined {
  const balance = asset.token_info?.balance;
  return balance === undefined ? undefined : BigInt(balance);
}

/**
 * Metaplex NFTs (V1_NFT, V2_NFT, LEGACY_NFT, ProgrammableNFT), Core assets and cNFTs. Anything
 * else counts when it's a lone, indivisible token: 0 decimals and a supply of 1 (or, when DAS
 * leaves out the supply, a balance of 1).
 */
export function isNftAsset(asset: DasAsset): boolean {
  if (isCompressed(asset) || asset.interface === "MplCoreAsset") return true;
  if (asset.interface?.includes("NFT")) return true;
  const info = asset.token_info;
  if (info?.decimals !== 0) return false;
  const loneUnit = info.supply !== undefined ? BigInt(info.supply) : reportedBalance(asset);
  return loneUnit === 1n;
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
