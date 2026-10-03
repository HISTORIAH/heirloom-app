export type DasFile = { uri?: string; cdn_uri?: string; mime?: string };
export type DasMetadata = { name?: string; symbol?: string };
export type DasLinks = { image?: string };
export type DasContent = {
  metadata?: DasMetadata;
  links?: DasLinks;
  files?: DasFile[];
};
/** USD price DAS attaches to well-known fungibles. Absent for most long-tail mints. */
export type DasPriceInfo = { price_per_token?: number; total_price?: number; currency?: string };
export type DasTokenInfo = { symbol?: string; decimals?: number; price_info?: DasPriceInfo };
export type DasAsset = {
  id?: string;
  content?: DasContent;
  token_info?: DasTokenInfo;
};

export type DasFungibleAsset = {
  id: string;
  token_info?: {
    balance?: string | number;
    decimals?: number;
    symbol?: string;
    token_program?: string;
    price_info?: DasPriceInfo;
  };
  content?: DasContent;
};

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

export function pickImage(content?: DasContent): string | undefined {
  const file = content?.files?.find((f) => !f.mime || f.mime.startsWith("image/"));
  return file?.cdn_uri || content?.links?.image || file?.uri;
}

export async function fetchAssetBatch(
  url: string,
  ids: string[],
  signal: AbortSignal,
): Promise<Map<string, DasAsset>> {
  const out = new Map<string, DasAsset>();
  if (ids.length === 0) return out;

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 1000) chunks.push(ids.slice(i, i + 1000));

  for (const chunk of chunks) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "heirloom-token-metadata",
        method: "getAssetBatch",
        params: { ids: chunk },
      }),
    });
    if (!res.ok) throw new Error(`Helius ${res.status}`);
    const json = (await res.json()) as { result?: Array<DasAsset | null> };
    const items = Array.isArray(json.result) ? json.result : [];
    items.forEach((item, idx) => {
      if (!item) return;
      const mint = item.id ?? chunk[idx];
      if (!mint) return;
      out.set(mint, item);
    });
  }
  return out;
}

export async function fetchAssetsByOwner(
  url: string,
  owner: string,
  signal: AbortSignal,
): Promise<DasFungibleAsset[]> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "heirloom-assets",
      method: "getAssetsByOwner",
      params: {
        ownerAddress: owner,
        page: 1,
        limit: 1000,
        options: {
          showFungible: true,
          showZeroBalance: false,
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Helius ${res.status}`);
  const json = (await res.json()) as {
    result?: { items?: Array<DasFungibleAsset | null> };
  };
  return (json.result?.items ?? []).filter((item): item is DasFungibleAsset => !!item);
}
