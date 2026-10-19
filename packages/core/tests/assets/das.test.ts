import { afterEach, describe, expect, mock, test } from "bun:test";

import {
  assetDisplay,
  DAS_PAGE_LIMIT,
  fetchAssetsByMint,
  fetchOwnerAssets,
  type DasAsset,
} from "@heirloom/core/assets";

const URL = "https://das.test";
const realFetch = globalThis.fetch;

/** Answers each DAS call with the next reply in `replies`, and records the request bodies. */
function stubFetch(replies: unknown[]) {
  const bodies: Array<{ method: string; params: Record<string, unknown> }> = [];
  globalThis.fetch = mock(async (_url: string, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return Response.json(replies[bodies.length - 1]);
  }) as unknown as typeof fetch;
  return bodies;
}

function assets(count: number, prefix: string): DasAsset[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i}` }));
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("fetchOwnerAssets", () => {
  test("keeps paging while pages come back full", async () => {
    const bodies = stubFetch([
      { result: { items: assets(DAS_PAGE_LIMIT, "a") } },
      { result: { items: assets(3, "b") } },
    ]);
    const owned = await fetchOwnerAssets(URL, "owner");
    expect(owned).toHaveLength(DAS_PAGE_LIMIT + 3);
    expect(bodies.map((body) => body.params.page)).toEqual([1, 2]);
  });

  test("drops null and id-less items", async () => {
    stubFetch([{ result: { items: [null, {}, { id: "kept" }] } }]);
    expect(await fetchOwnerAssets(URL, "owner")).toEqual([{ id: "kept" }]);
  });

  test("throws when DAS answers with an RPC error", async () => {
    stubFetch([{ error: { code: -32602, message: "Invalid params" } }]);
    expect(fetchOwnerAssets(URL, "owner")).rejects.toThrow("Invalid params");
  });
});

describe("fetchAssetsByMint", () => {
  test("splits large lookups into batches and keys the result by mint", async () => {
    const mints = assets(DAS_PAGE_LIMIT + 1, "m").map((asset) => asset.id);
    const bodies = stubFetch([
      { result: mints.slice(0, DAS_PAGE_LIMIT).map((id) => ({ id })) },
      { result: [null] },
    ]);
    const byMint = await fetchAssetsByMint(URL, mints);
    expect(bodies).toHaveLength(2);
    expect(byMint.size).toBe(DAS_PAGE_LIMIT);
    expect(byMint.get("m0")).toEqual({ id: "m0" });
  });

  test("makes no call for an empty list", async () => {
    const bodies = stubFetch([]);
    expect((await fetchAssetsByMint(URL, [])).size).toBe(0);
    expect(bodies).toHaveLength(0);
  });
});

describe("assetDisplay", () => {
  test("treats blank metadata as missing and prefers the token symbol", () => {
    const asset: DasAsset = {
      id: "mint",
      token_info: { symbol: " USDC " },
      content: { metadata: { name: "  ", symbol: "OLD" }, links: { image: "https://img" } },
    };
    expect(assetDisplay(asset)).toEqual({ name: undefined, symbol: "USDC", image: "https://img" });
  });
});
