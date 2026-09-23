/**
 * Rebuilds `public/catalog.json` from the issuers' published lists.
 *
 *   bun run catalog:refresh
 *
 * The browser cannot do this itself: the xStocks API sends no CORS headers,
 * and a full refresh is roughly 5 MB. So the snapshot ships with the app, and
 * this script is rerun to pick up new listings. A source that fails keeps its
 * entries from the current snapshot rather than dropping them.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  fetchAllXStocks,
  mergeCatalog,
  ONDO_CONSTANTS_URL,
  parseCatalog,
  parseOndoConstants,
  type Catalog,
  type CatalogEntry,
  type CatalogIssuer,
} from "../src/services/catalog";

const OUTPUT = path.resolve(import.meta.dir, "..", "public", "catalog.json");

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

const current = await previous();
const entries = mergeCatalog(
  await source("xstocks", () => fetchAllXStocks(), current),
  await source("ondo", fetchOndo, current),
);

const catalog: Catalog = { generatedAt: new Date().toISOString(), entries };
await writeFile(OUTPUT, `${JSON.stringify(catalog)}\n`);
console.log(`wrote ${entries.length} entries to ${path.relative(process.cwd(), OUTPUT)}`);
