import { DAS_PAGE_LIMIT } from "@/constants/api";
import type { DasAsset, DasAssetPage, DasContent, DasRpcResponse } from "@/types/das";

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

function present(text: string | undefined): string | undefined {
  const trimmed = text?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Symbol and name for a mint. DAS often sends "" for mints without metadata, so blanks count
 * as missing; with neither, the token is "Unknown token" and `named` is false.
 */
export function pickLabel(
  mint: string,
  tokenSymbol: string | undefined,
  content?: DasContent,
): { symbol: string; name: string; named: boolean } {
  const symbol = present(tokenSymbol) ?? present(content?.metadata?.symbol);
  const name = present(content?.metadata?.name) ?? symbol;
  return {
    symbol: symbol ?? mint.slice(0, 4),
    name: name ?? "Unknown token",
    named: name !== undefined,
  };
}

/** The asset's image: first image file (CDN copy preferred), else the metadata link. */
export function assetImageUrl(content?: DasContent): string | undefined {
  const imageFile = content?.files?.find((file) => !file.mime || file.mime.startsWith("image/"));
  return imageFile?.cdn_uri || content?.links?.image || imageFile?.uri;
}

/** Looks up assets by mint, keyed by mint. Mints DAS doesn't know are left out. */
export async function fetchAssetsByMint(
  url: string,
  mints: string[],
  signal?: AbortSignal,
): Promise<Map<string, DasAsset>> {
  const assetsByMint = new Map<string, DasAsset>();

  for (const ids of chunk(mints, DAS_PAGE_LIMIT)) {
    const items = await callDas<Array<DasAsset | null>>(url, "getAssetBatch", { ids }, signal);
    for (const asset of (items ?? []).filter(isAsset)) {
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
