import { DAS_PAGE_LIMIT } from "@/lib/constants";
import type {
  DasAsset,
  DasAssetDisplay,
  DasAssetPage,
  DasContent,
  DasRpcResponse,
} from "@/types/das";

/** One JSON-RPC call to a DAS-enabled endpoint (Helius). Throws on HTTP or RPC errors. */
async function callDas<T>(
  url: string,
  method: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T | undefined> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ jsonrpc: "2.0", id: `heirloom-${method}`, method, params }),
  });
  if (!res.ok) throw new Error(`DAS ${method} failed: HTTP ${res.status}`);

  const json = (await res.json()) as DasRpcResponse<T>;
  if (json.error) throw new Error(`DAS ${method} failed: ${json.error.message ?? json.error.code}`);
  return json.result;
}

function isAsset(item: DasAsset | null | undefined): item is DasAsset {
  return !!item?.id;
}

/** The asset's image: first image file (CDN copy preferred), else the metadata link. */
function assetImageUrl(content?: DasContent): string | undefined {
  const imageFile = content?.files?.find((file) => !file.mime || file.mime.startsWith("image/"));
  return imageFile?.cdn_uri || content?.links?.image || imageFile?.uri;
}

/** Name, symbol and image to show for an asset. Blank values come back undefined. */
export function assetDisplay(asset: DasAsset): DasAssetDisplay {
  const metadata = asset.content?.metadata;
  return {
    name: metadata?.name?.trim() || undefined,
    symbol: asset.token_info?.symbol?.trim() || metadata?.symbol?.trim() || undefined,
    image: assetImageUrl(asset.content),
  };
}

/** Every asset the owner holds with a non-zero balance: fungible tokens, NFTs and cNFTs. */
export async function fetchOwnerAssets(
  url: string,
  owner: string,
  signal?: AbortSignal,
): Promise<DasAsset[]> {
  const assets: DasAsset[] = [];

  for (let page = 1; ; page++) {
    const result = await callDas<DasAssetPage>(
      url,
      "getAssetsByOwner",
      {
        ownerAddress: owner,
        page,
        limit: DAS_PAGE_LIMIT,
        options: { showFungible: true, showZeroBalance: false },
      },
      signal,
    );
    const items = result?.items ?? [];
    assets.push(...items.filter(isAsset));

    const isLastPage = items.length < DAS_PAGE_LIMIT;
    if (isLastPage) return assets;
  }
}
