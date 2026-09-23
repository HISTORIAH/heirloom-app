import type { Address } from "@solana/kit";
import type { CatalogEntry, CatalogIssuer } from "@/services/catalog";

/**
 * The catalog regrouped by the security each token tracks, so a company that
 * both issuers list shows its two tokens side by side — the comparison worth
 * making, since the issuers keep different powers over a holder's position.
 */
export interface CompanyGroup {
  /** The listed ticker both tokens track, e.g. `AAPL`. */
  ticker: string;
  /** Display name for the company or fund, e.g. `Apple`. */
  company: string;
  /** One token per issuer, xStocks first. */
  listings: CatalogEntry[];
}

export type IssuerFilter = CatalogIssuer | "all";

const ISSUER_ORDER: CatalogIssuer[] = ["xstocks", "ondo"];

/** Issuers suffix the security's name with their own brand; this strips it. */
const NAME_SUFFIX: Record<CatalogIssuer, RegExp> = {
  xstocks: /\s*xStock$/i,
  ondo: /\s*\(Ondo Tokenized\)$/i,
};

export function companyName(entry: CatalogEntry): string {
  return entry.name.replace(NAME_SUFFIX[entry.issuer], "").trim() || entry.symbol;
}

/**
 * Lettered tickers alphabetically, then numeric exchange codes (Hong Kong's
 * `1`, `12`, `1024`, …) in numeric order, so the list doesn't open on them.
 */
function compareTickers(a: string, b: string): number {
  const numeric = (t: string) => Number(/^\d/.test(t));
  return numeric(a) - numeric(b) || a.localeCompare(b, "en", { numeric: true });
}

/**
 * Groups entries by underlying ticker, sorted by ticker. The heading prefers
 * Ondo's name, which is the formal one ("iShares Russell 2000 ETF" where
 * xStocks says "Russell 2000"), and falls back to xStocks'.
 */
export function groupByCompany(entries: CatalogEntry[]): CompanyGroup[] {
  const groups = new Map<string, CatalogEntry[]>();
  for (const entry of entries) {
    const ticker = entry.underlying ?? entry.symbol;
    groups.set(ticker, [...(groups.get(ticker) ?? []), entry]);
  }

  return [...groups]
    .map(([ticker, listings]) => {
      listings.sort((a, b) => ISSUER_ORDER.indexOf(a.issuer) - ISSUER_ORDER.indexOf(b.issuer));
      const named = listings.find((l) => l.issuer === "ondo") ?? listings[0]!;
      return { ticker, company: companyName(named), listings };
    })
    .sort((a, b) => compareTickers(a.ticker, b.ticker));
}

export interface BrowseFilter {
  query: string;
  issuer: IssuerFilter;
  /** When set, only these mints are kept: what the connected wallet holds or has vaulted. */
  only?: Set<Address> | null;
}

/**
 * Narrows the groups to what matches, best matches first: an exact ticker or
 * symbol, then a ticker that starts with the query, then anything containing
 * it. A pasted mint address matches its own token.
 */
export function filterGroups(groups: CompanyGroup[], filter: BrowseFilter): CompanyGroup[] {
  const q = filter.query.trim().toLowerCase();
  const scored: { group: CompanyGroup; score: number }[] = [];

  for (const group of groups) {
    const listings = group.listings.filter(
      (l) =>
        (filter.issuer === "all" || l.issuer === filter.issuer) &&
        (!filter.only || filter.only.has(l.mint)),
    );
    if (listings.length === 0) continue;

    const score = q ? matchScore(group, listings, q) : 0;
    if (score === null) continue;
    scored.push({ group: { ...group, listings }, score });
  }

  // Stable, so ties keep ticker order.
  return scored.sort((a, b) => a.score - b.score).map((s) => s.group);
}

function matchScore(group: CompanyGroup, listings: CatalogEntry[], q: string): number | null {
  const ticker = group.ticker.toLowerCase();
  const symbols = listings.map((l) => l.symbol.toLowerCase());
  if (ticker === q || symbols.includes(q) || listings.some((l) => l.mint.toLowerCase() === q)) {
    return 0;
  }
  if (ticker.startsWith(q)) return 1;
  const text = [ticker, group.company, ...listings.map((l) => `${l.symbol} ${l.name}`)]
    .join(" ")
    .toLowerCase();
  return text.includes(q) ? 2 : null;
}

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/**
 * Jupiter's swap page with USDC → this token preselected. It must be the
 * `sell`/`buy` query form: the older `/swap/USDC-<mint>` path silently falls
 * back to SOL for tokens it doesn't recognise by symbol.
 */
export function jupiterSwapUrl(mint: Address): string {
  return `https://jup.ag/swap?sell=${USDC_MINT}&buy=${mint}`;
}
