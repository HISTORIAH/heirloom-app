import { isAddress, type Address } from "@solana/kit";

/**
 * The issuer catalog: display metadata for the tokenized equities we know of.
 *
 * It is enrichment, not the source of truth. Whether a holding is a supported
 * stock is decided on-chain, by its mint authority's `IssuerRegistry` entry —
 * the same check `cover_asset` makes — and names and symbols are also carried
 * by the mints' own Token-2022 metadata. The catalog adds logos, the underlying
 * listing, and a label for issuers not yet registered on the current cluster.
 *
 * It is built by `scripts/refresh-catalog.ts` rather than fetched from the
 * issuers by the browser: the xStocks API sends no CORS headers, and a full
 * refresh is ten pages of about half a megabyte each. The script writes
 * `public/catalog.json`, which is what the app loads. This module holds the
 * parsing and validation both sides share, so it must stay free of browser and
 * `@/` imports.
 */

export type CatalogIssuer = "xstocks" | "ondo";

export interface CatalogEntry {
  mint: Address;
  symbol: string;
  name: string;
  issuer: CatalogIssuer;
  /** The listed security the token tracks, e.g. `AAPL`. */
  underlying: string | null;
  logo: string | null;
  /**
   * Whether Jupiter had an on-chain market for it when the catalog was built.
   * Most xStocks listings don't. Only a hint for ordering and filtering: the
   * page reads live prices, and a live price is what shows a Trade button.
   */
  tradable?: boolean;
}

export interface Catalog {
  generatedAt: string;
  entries: CatalogEntry[];
}

export const XSTOCKS_ASSETS_URL = "https://api.xstocks.fi/api/v2/public/assets";

/** Ondo publishes its Solana mints as a Rust constants table, not an API. */
export const ONDO_CONSTANTS_URL =
  "https://raw.githubusercontent.com/ondoprotocol/gm-solana-simulator/main/constants.rs";

/**
 * A usable Solana address: base58 that decodes to exactly 32 bytes.
 *
 * Checked on every entry because the published lists are not clean — Ondo's
 * `ONDSon` mint decodes to 31 bytes — and a single malformed key fails a whole
 * `getMultipleAccounts` batch with `WrongSize`, not just its own lookup.
 */
export function isValidMint(value: unknown): value is Address {
  return typeof value === "string" && isAddress(value);
}

// ------------------------------------------------------------------- xStocks

interface XStocksDeployment {
  network?: string;
  address?: string;
}

interface XStocksAsset {
  symbol?: string;
  name?: string;
  underlyingSymbol?: string | null;
  logo?: string | null;
  deployments?: XStocksDeployment[];
}

export interface XStocksPage {
  nodes?: XStocksAsset[];
  page?: { currentPage?: number; hasNextPage?: boolean };
}

/** The Solana entries on one page of the xStocks assets API. */
export function parseXStocksPage(page: XStocksPage): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const asset of page.nodes ?? []) {
    const mint = asset.deployments?.find((d) => d.network === "Solana")?.address;
    if (!isValidMint(mint) || !asset.symbol) continue;
    entries.push({
      mint,
      symbol: asset.symbol,
      name: asset.name ?? asset.symbol,
      issuer: "xstocks",
      underlying: asset.underlyingSymbol ?? null,
      logo: asset.logo ?? null,
    });
  }
  return entries;
}

// ---------------------------------------------------------------------- Ondo

const ONDO_ENTRY = /\(\s*"([A-Za-z0-9.]+)"\s*,\s*"([1-9A-HJ-NP-Za-km-z]+)"\s*\)/g;

/**
 * The `("AAPLon", "<mint>")` pairs in Ondo's constants file. The file carries
 * no names, so the symbol stands in; Ondo symbols are the underlying ticker
 * with an `on` suffix.
 */
export function parseOndoConstants(source: string): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const [, symbol, mint] of source.matchAll(ONDO_ENTRY)) {
    if (!symbol || !symbol.endsWith("on") || !isValidMint(mint)) continue;
    entries.push({
      mint,
      symbol,
      name: symbol,
      issuer: "ondo",
      underlying: symbol.slice(0, -2) || null,
      logo: null,
    });
  }
  return entries;
}

// ------------------------------------------------------------ token labels

/** What a mint says about itself: its metadata name, and the image its metadata URI links. */
export interface TokenLabel {
  name: string | null;
  logo: string | null;
}

/** Logos are rendered straight into `<img>`, so only plain https URLs are kept. */
export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Fills in names and logos from each mint's own metadata. Ondo's constants
 * file carries neither, so without this every Ondo stock shows its symbol
 * twice and no logo.
 *
 * Where a mint's metadata couldn't be read this time, what the previous
 * snapshot had is kept, so a flaky RPC or metadata host never strips labels
 * an earlier refresh found.
 */
export function withTokenLabels(
  entries: CatalogEntry[],
  labels: Map<Address, TokenLabel>,
  previous: Map<Address, CatalogEntry>,
): CatalogEntry[] {
  return entries.map((entry) => {
    const label = labels.get(entry.mint);
    const before = previous.get(entry.mint);
    return {
      ...entry,
      name: label?.name || before?.name || entry.name,
      logo: label?.logo ?? before?.logo ?? entry.logo,
    };
  });
}

/**
 * Marks each entry with whether it has a market, keeping the previous
 * snapshot's mark for any mint the price lookup didn't cover.
 */
export function withTradable(
  entries: CatalogEntry[],
  priced: Map<Address, boolean>,
  previous: Map<Address, CatalogEntry>,
): CatalogEntry[] {
  return entries.map((entry) => {
    const tradable = priced.get(entry.mint) ?? previous.get(entry.mint)?.tradable;
    return tradable === undefined ? entry : { ...entry, tradable };
  });
}

// ------------------------------------------------------------------- catalog

/** Drops duplicate mints, keeping the first, and sorts by symbol. */
export function mergeCatalog(...lists: CatalogEntry[][]): CatalogEntry[] {
  const byMint = new Map<Address, CatalogEntry>();
  for (const entry of lists.flat()) {
    if (!byMint.has(entry.mint)) byMint.set(entry.mint, entry);
  }
  return [...byMint.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/**
 * Validates a catalog read back from `catalog.json`. Every entry is checked
 * again rather than trusted, so a hand edit cannot put a bad key in a batch.
 */
export function parseCatalog(raw: unknown): Catalog {
  const value = raw as Partial<Catalog> | null;
  const entries = Array.isArray(value?.entries) ? value.entries : [];
  return {
    generatedAt: typeof value?.generatedAt === "string" ? value.generatedAt : "",
    entries: entries.filter(
      (entry): entry is CatalogEntry =>
        !!entry &&
        isValidMint(entry.mint) &&
        typeof entry.symbol === "string" &&
        typeof entry.name === "string" &&
        (entry.issuer === "xstocks" || entry.issuer === "ondo"),
    ),
  };
}

export const EMPTY_CATALOG: Catalog = { generatedAt: "", entries: [] };

/**
 * Loads the catalog the app ships with. Failure is not fatal: holdings are
 * still recognised on-chain and labelled from their own metadata, so this
 * resolves to an empty catalog rather than throwing.
 */
export async function fetchCatalog(url = "/catalog.json"): Promise<Catalog> {
  try {
    const response = await fetch(url);
    if (!response.ok) return EMPTY_CATALOG;
    return parseCatalog(await response.json());
  } catch {
    return EMPTY_CATALOG;
  }
}

/** Fetches every page of the xStocks assets API. For the refresh script. */
export async function fetchAllXStocks(
  fetchImpl: typeof fetch = fetch,
  maxPages = 50,
): Promise<CatalogEntry[]> {
  const entries: CatalogEntry[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const response = await fetchImpl(`${XSTOCKS_ASSETS_URL}?page=${page}`);
    if (!response.ok) throw new Error(`xStocks page ${page}: HTTP ${response.status}`);
    const body = (await response.json()) as XStocksPage;
    entries.push(...parseXStocksPage(body));
    if (!body.page?.hasNextPage) break;
  }
  return entries;
}
