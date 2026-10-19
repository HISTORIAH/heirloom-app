import type {
  AssetDisplay,
  DasAsset,
  DasAssetPage,
  DasContent,
  DasGrouping,
  DasRpcResponse,
} from "../types/assets";
import { DAS_BATCH_SIZE, DAS_MAX_PAGES, DAS_PAGE_SIZE } from "./constants";

/** One JSON-RPC call to a DAS-enabled endpoint (Helius). Throws on HTTP or RPC errors. */
async function callDas<T>(
  url: string,
  method: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ jsonrpc: "2.0", id: `heirloom-${method}`, method, params }),
  });
  if (!res.ok) throw new Error(`DAS ${method} failed: HTTP ${res.status}`);

  const json = (await res.json()) as DasRpcResponse<T>;
  if (json.error) throw new Error(`DAS ${method} failed: ${json.error.message ?? json.error.code}`);
  if (json.result === undefined) throw new Error(`DAS ${method} failed: no result`);
  return json.result;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}

function isAsset(item: DasAsset | null | undefined): item is DasAsset {
  return !!item?.id;
}

/** Trimmed text, or undefined when DAS sent nothing or only whitespace. */
function nonBlank(text: string | undefined): string | undefined {
  return text?.trim() || undefined;
}

function collectionGroup(asset: DasAsset): DasGrouping | undefined {
  return asset.grouping?.find((group) => group.group_key === "collection");
}

/** The asset's image: first image file (CDN copy preferred), else the metadata link. */
export function assetImageUrl(content?: DasContent): string | undefined {
  const imageFile = content?.files?.find((file) => !file.mime || file.mime.startsWith("image/"));
  return imageFile?.cdn_uri || content?.links?.image || imageFile?.uri;
}

/** Name, symbol and image to show for an asset. Fallback wording is up to each app. */
export function assetDisplay(asset: DasAsset): AssetDisplay {
  const metadata = asset.content?.metadata;
  return {
    name: nonBlank(metadata?.name),
    symbol: nonBlank(asset.token_info?.symbol) ?? nonBlank(metadata?.symbol),
    image: assetImageUrl(asset.content),
    collection: nonBlank(collectionGroup(asset)?.collection_metadata?.name),
  };
}

/** Looks up assets by mint, keyed by mint. Mints DAS doesn't know are left out. */
export async function fetchAssetsByMint(
  url: string,
  mints: string[],
  signal?: AbortSignal,
): Promise<Map<string, DasAsset>> {
  const assetsByMint = new Map<string, DasAsset>();

  for (const ids of chunk(mints, DAS_BATCH_SIZE)) {
    const items = await callDas<Array<DasAsset | null>>(url, "getAssetBatch", { ids }, signal);
    for (const asset of items.filter(isAsset)) {
      assetsByMint.set(asset.id, asset);
    }
  }
  return assetsByMint;
}

/** Every asset the owner holds with a non-zero balance: fungible tokens, NFTs and cNFTs. */
export async function fetchOwnerAssets(
  url: string,
  owner: string,
  signal?: AbortSignal,
): Promise<DasAsset[]> {
  const assets: DasAsset[] = [];

  for (let page = 1; page <= DAS_MAX_PAGES; page++) {
    const { items = [] } = await callDas<DasAssetPage>(
      url,
      "getAssetsByOwner",
      {
        ownerAddress: owner,
        page,
        limit: DAS_PAGE_SIZE,
        // Collection metadata rides on the same call, so NFTs can show their collection name.
        options: { showFungible: true, showZeroBalance: false, showCollectionMetadata: true },
      },
      signal,
    );
    assets.push(...items.filter(isAsset));

    const isLastPage = items.length < DAS_PAGE_SIZE;
    if (isLastPage) return assets;
  }
  throw new Error(`DAS getAssetsByOwner returned more than ${DAS_MAX_PAGES} full pages`);
}
