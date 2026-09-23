import { DOCS_URL, LANDING_URL } from "@/config";
import type { CatalogEntry } from "@/services/catalog";

/** Where the landing sends people off-origin. The docs are English only. */
export const STOCKS_DOCS_URL = `${DOCS_URL}stocks/overview/`;
export const ISSUER_DOCS_URL = `${DOCS_URL}stocks/issuer-risk/`;
export const SITE_URL = LANDING_URL;
export const GITHUB_URL = "https://github.com/HISTORIAH/Heirloom-app";
export const X_URL = "https://x.com/heirloom_app";

/**
 * Underlyings the landing features, in order. Both issuers list every one of
 * them and Jupiter has a market for each, so a price and a logo are there to
 * show. Anything the catalog lacks is skipped rather than faked.
 */
export const FEATURED_UNDERLYINGS = [
  "AAPL",
  "NVDA",
  "TSLA",
  "SPY",
  "MSFT",
  "GOOGL",
  "AMZN",
  "META",
  "COIN",
  "MSTR",
  "HOOD",
  "CRCL",
  "NFLX",
  "QQQ",
] as const;

/** The featured listings of one issuer, in `FEATURED_UNDERLYINGS` order. */
export function featuredListings(
  entries: CatalogEntry[],
  issuer: CatalogEntry["issuer"],
): CatalogEntry[] {
  const byUnderlying = new Map(
    entries.filter((e) => e.issuer === issuer && e.underlying).map((e) => [e.underlying, e]),
  );
  return FEATURED_UNDERLYINGS.flatMap((u) => byUnderlying.get(u) ?? []);
}
