import { useQuery } from "@tanstack/react-query";
import { fetchAssetsByOwner, pickImage, type DasFungibleAsset } from "@/lib/heliusDas";
import { truncateAddress, convertToUiAmount } from "@/lib/utils";
import type { SplTokenAsset } from "@/types";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { heliusRpcUrl } from "@/config/constants";

function dasAssetToToken(asset: DasFungibleAsset): SplTokenAsset | null {
  const mint = asset.id;
  const tokenInfo = asset.token_info;

  if (!mint || (tokenInfo?.balance ?? 0) === 0) return null;

  const decimals = tokenInfo?.decimals ?? 0;
  const balance = tokenInfo?.balance ?? 0;
  const raw = BigInt(Math.floor(balance));

  if (raw === 0n) return null;

  const symbol = tokenInfo?.symbol ?? asset.content?.metadata?.symbol;

  return {
    mint,
    label: symbol || truncateAddress(mint),
    name: asset.content?.metadata?.name,
    symbol: symbol ?? undefined,
    image: pickImage(asset.content),
    decimals,
    uiAmount: convertToUiAmount(raw, decimals),
    // Pull from DAS or fallback to Legacy Token Program
    tokenProgram: tokenInfo?.token_program ?? TOKEN_PROGRAM_ADDRESS,
  };
}

async function fetchTokens(owner: string): Promise<SplTokenAsset[]> {
  const heliusUrl = heliusRpcUrl();
  if (!heliusUrl) throw new Error("Helius URL not configured");

  // Fetch from DAS
  const assets = await fetchAssetsByOwner(heliusUrl, owner, new AbortController().signal);

  // Map and filter—no extra RPC call needed!
  return assets
    .map(dasAssetToToken)
    .filter((t): t is SplTokenAsset => t !== null);
}
export function useWalletSplTokens(owner: string | null) {
  return useQuery({
    queryKey: ["wallet-spl-tokens", owner],
    queryFn: () => {
      if (!owner) return Promise.resolve([]);
      return fetchTokens(owner);
    },
    enabled: !!owner,
    staleTime: 30_000,
  });
}
