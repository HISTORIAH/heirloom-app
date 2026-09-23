/**
 * Rebuilds `public/catalog.json` from the issuers' published lists.
 *
 *   bun run catalog:refresh
 *   bun run catalog:refresh --rpc <mainnet url>
 *
 * The browser cannot do this itself: the xStocks API sends no CORS headers,
 * and a full refresh is roughly 5 MB. So the snapshot ships with the app, and
 * this script is rerun to pick up new listings. A source that fails keeps its
 * entries from the current snapshot rather than dropping them.
 *
 * Ondo's list has no names or logos, so those are read from each Ondo mint's
 * own Token-2022 metadata on mainnet — about five `getMultipleAccounts` calls,
 * which the public endpoint handles. `--rpc` (or `CATALOG_RPC_URL`) points it
 * elsewhere; the URL is never printed, since it may carry an API key.
 *
 * Every entry is also marked with whether Jupiter has a market for it, which
 * the browse page orders by. Most xStocks listings have none.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { createSolanaRpc, fetchEncodedAccounts, unwrapOption, type Address } from "@solana/kit";
import { decodeMint } from "@solana-program/token-2022";

import {
  fetchAllXStocks,
  isHttpsUrl,
  mergeCatalog,
  ONDO_CONSTANTS_URL,
  parseCatalog,
  parseOndoConstants,
  withTokenLabels,
  withTradable,
  type Catalog,
  type CatalogEntry,
  type CatalogIssuer,
  type TokenLabel,
} from "../src/services/catalog";

const OUTPUT = path.resolve(import.meta.dir, "..", "public", "catalog.json");

const { values } = parseArgs({ options: { rpc: { type: "string" } } });
const RPC_URL = values.rpc ?? process.env.CATALOG_RPC_URL ?? "https://api.mainnet-beta.solana.com";

/** `getMultipleAccounts` takes at most 100 keys per call. */
const BATCH = 100;
/** Jupiter's price API takes at most 50 ids per call. */
const PRICE_BATCH = 50;
const JUPITER_PRICES = "https://lite-api.jup.ag/price/v3";
/** Metadata JSON fetches in flight at once. */
const CONCURRENCY = 8;

async function previous(): Promise<Catalog> {
  try {
    return parseCatalog(JSON.parse(await readFile(OUTPUT, "utf8")));
  } catch {
    return { generatedAt: "", entries: [] };
  }
}

async function fetchOndo(): Promise<CatalogEntry[]> {
  const response = await fetch(ONDO_CONSTANTS_URL);
  if (!response.ok) throw new Error(`Ondo constants: HTTP ${response.status}`);
  return parseOndoConstants(await response.text());
}

async function source(
  issuer: CatalogIssuer,
  load: () => Promise<CatalogEntry[]>,
  fallback: Catalog,
): Promise<CatalogEntry[]> {
  try {
    const entries = await load();
    console.log(`${issuer}: ${entries.length} mints`);
    return entries;
  } catch (error) {
    const kept = fallback.entries.filter((e) => e.issuer === issuer);
    console.warn(`${issuer}: ${(error as Error).message}; keeping ${kept.length} from snapshot`);
    return kept;
  }
}

/** The `image` a metadata JSON links, or null if it can't be read. */
async function metadataImage(uri: string): Promise<string | null> {
  if (!isHttpsUrl(uri)) return null;
  try {
    const response = await fetch(uri, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    const { image } = (await response.json()) as { image?: unknown };
    return isHttpsUrl(image) ? image : null;
  } catch {
    return null;
  }
}

/** Each mint's metadata name, and the logo its metadata URI links. */
async function readTokenLabels(mints: Address[]): Promise<Map<Address, TokenLabel>> {
  const rpc = createSolanaRpc(RPC_URL);
  const found: { mint: Address; name: string; uri: string }[] = [];

  for (let i = 0; i < mints.length; i += BATCH) {
    const accounts = await fetchEncodedAccounts(rpc, mints.slice(i, i + BATCH));
    for (const account of accounts) {
      if (!account.exists) continue;
      try {
        const extensions = unwrapOption(decodeMint(account).data.extensions) ?? [];
        const metadata = extensions.find((e) => e.__kind === "TokenMetadata");
        if (metadata?.__kind !== "TokenMetadata") continue;
        found.push({ mint: account.address, name: metadata.name.trim(), uri: metadata.uri.trim() });
      } catch {
        // Not a Token-2022 mint; nothing to read.
      }
    }
  }

  const labels = new Map<Address, TokenLabel>();
  let next = 0;
  const worker = async () => {
    while (next < found.length) {
      const { mint, name, uri } = found[next++]!;
      labels.set(mint, { name: name || null, logo: await metadataImage(uri) });
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return labels;
}

/** Whether Jupiter quotes each mint: it only gives a `usdPrice` where there's a market. */
async function readTradable(mints: Address[]): Promise<Map<Address, boolean>> {
  const tradable = new Map<Address, boolean>();
  for (let i = 0; i < mints.length; i += PRICE_BATCH) {
    const batch = mints.slice(i, i + PRICE_BATCH);
    const response = await fetch(`${JUPITER_PRICES}?ids=${batch.join(",")}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const prices = (await response.json()) as Record<string, { usdPrice?: unknown } | null>;
    for (const mint of batch) tradable.set(mint, typeof prices[mint]?.usdPrice === "number");
  }
  return tradable;
}

const current = await previous();
const xstocks = await source("xstocks", () => fetchAllXStocks(), current);
const ondo = await source("ondo", fetchOndo, current);

const labels = await readTokenLabels(ondo.map((e) => e.mint)).catch((error: Error) => {
  console.warn(`ondo labels: ${error.message}; keeping names and logos from snapshot`);
  return new Map<Address, TokenLabel>();
});
const withLogo = [...labels.values()].filter((l) => l.logo).length;
console.log(`ondo labels: ${labels.size} names, ${withLogo} logos`);

const before = new Map(current.entries.map((e) => [e.mint, e]));
const merged = mergeCatalog(xstocks, withTokenLabels(ondo, labels, before));

const tradable = await readTradable(merged.map((e) => e.mint)).catch((error: Error) => {
  console.warn(`markets: ${error.message}; keeping the snapshot's marks`);
  return new Map<Address, boolean>();
});
const entries = withTradable(merged, tradable, before);
console.log(`markets: ${entries.filter((e) => e.tradable).length} of ${entries.length} tradable`);

const catalog: Catalog = { generatedAt: new Date().toISOString(), entries };
await writeFile(OUTPUT, `${JSON.stringify(catalog)}\n`);
console.log(`wrote ${entries.length} entries to ${path.relative(process.cwd(), OUTPUT)}`);
