import { useQuery } from "@tanstack/react-query";
import {
  assetDisplay,
  fetchOwnerAssets,
  heldAmount,
  isNftAsset,
  unsupportedReason,
  type DasAsset,
} from "@heirloom/core/assets";
import { truncateAddress, toUiAmount } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { IS_DEV, SOLANA_RPC_ENDPOINT } from "@/config";

function dasAssetToToken(asset: DasAsset): SplTokenAsset | null {
  const tokenInfo = asset.token_info;
  const balance = heldAmount(asset);
  if (balance === 0n) return null;

  const decimals = tokenInfo?.decimals ?? 0;
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
    isNft: isNftAsset(asset),
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
    compressed: asset.compression?.compressed,
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
