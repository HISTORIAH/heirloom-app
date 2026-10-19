import { useQuery } from "@tanstack/react-query";
import { assetDisplay, fetchOwnerAssets } from "@/services/das";
import { truncateAddress, toUiAmount } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import type { UnsupportedAssetReason } from "@/types/assets";
import type { DasAsset } from "@/types/das";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { IS_DEV, SOLANA_RPC_ENDPOINT } from "@/config";

function isCompressed(asset: DasAsset): boolean {
  return asset.compression?.compressed ?? false;
}

/** Covers V1_NFT, ProgrammableNFT, Core assets and cNFTs (some of which report V1_NFT). */
function isNftAsset(asset: DasAsset): boolean {
  return (
    isCompressed(asset) ||
    asset.interface === "MplCoreAsset" ||
    (asset.interface?.includes("NFT") ?? false)
  );
}

/**
 * The vault holds plain SPL token accounts it can transfer out of. Compressed NFTs and Core
 * assets have no token account, pNFTs sit in a locked one, and frozen accounts can't move.
 */
function unsupportedReason(asset: DasAsset): UnsupportedAssetReason | undefined {
  if (isCompressed(asset)) return "compressed";
  if (asset.interface === "MplCoreAsset") return "core";
  if (asset.interface === "ProgrammableNFT") return "programmable";
  if (asset.ownership?.frozen) return "frozen";
  return undefined;
}

function dasAssetToToken(asset: DasAsset): SplTokenAsset | null {
  const tokenInfo = asset.token_info;
  // Core assets and cNFTs carry no token info. DAS only returns what the owner holds, so an
  // NFT without a balance is still one item.
  const balance = BigInt(tokenInfo?.balance ?? (isNftAsset(asset) ? 1 : 0));
  if (asset.burnt || balance === 0n) return null;

  const decimals = tokenInfo?.decimals ?? 0;
  // A lone, indivisible token is an NFT even when DAS reports an odd interface.
  const isNft = isNftAsset(asset) || (decimals === 0 && balance === 1n);
  const { name, symbol, image } = assetDisplay(asset);

  return {
    mint: asset.id,
    label: symbol || truncateAddress(asset.id),
    name,
    symbol,
    image,
    decimals,
    amount: balance,
    uiAmount: toUiAmount(balance, decimals),
    // DAS omits the program for some legacy mints.
    tokenProgram: tokenInfo?.token_program ?? TOKEN_PROGRAM_ADDRESS,
    isNft,
    unsupportedReason: unsupportedReason(asset),
  };
}

/** Dev-only: what DAS returned for the wallet, and which assets didn't make it into the list. */
function logWalletAssets(owner: string, assets: DasAsset[], tokens: SplTokenAsset[]) {
  if (!IS_DEV) return;

  const keptMints = new Set(tokens.map((token) => token.mint));
  const countsByInterface: Record<string, number> = {};
  for (const asset of assets) {
    const kind = asset.interface ?? "unknown";
    countsByInterface[kind] = (countsByInterface[kind] ?? 0) + 1;
  }
  const describe = (asset: DasAsset) => ({
    mint: asset.id,
    name: asset.content?.metadata?.name,
    interface: asset.interface,
    balance: asset.token_info?.balance,
    decimals: asset.token_info?.decimals,
    frozen: asset.ownership?.frozen,
    compressed: isCompressed(asset),
    kept: keptMints.has(asset.id),
    unsupported: unsupportedReason(asset),
  });

  console.groupCollapsed(`[das] ${owner}: ${assets.length} assets, ${tokens.length} kept`);
  console.log("by interface", countsByInterface);
  console.table(assets.filter(isNftAsset).map(describe));
  console.table(assets.filter((asset) => !keptMints.has(asset.id)).map(describe));
  console.groupEnd();
}

async function fetchWalletTokens(owner: string): Promise<SplTokenAsset[]> {
  if (!SOLANA_RPC_ENDPOINT) throw new Error("RPC URL NOT CONFIGURED");

  const assets = await fetchOwnerAssets(SOLANA_RPC_ENDPOINT, owner);
  const tokens = assets.map(dasAssetToToken).filter((token): token is SplTokenAsset => !!token);
  logWalletAssets(owner, assets, tokens);
  return tokens;
}

export function useWalletSplTokens(owner: string | null) {
  return useQuery<SplTokenAsset[]>({
    queryKey: ["wallet-spl-tokens", owner],
    queryFn: () => (owner ? fetchWalletTokens(owner) : []),
    enabled: !!owner,
    staleTime: 30_000,
  });
}
