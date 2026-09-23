import { localeHref } from "@heirloom/i18n";

// The marketing site is a separate Astro build on the apex domain; this app
// serves stocks.heirlm.xyz. Anything in here that means "go back to the site"
// leaves the origin, so it is a URL rather than a router path.
export const LANDING_URL = (
  import.meta.env.VITE_LANDING_URL?.trim() || "https://heirlm.xyz"
).replace(/\/+$/, "");

/** The landing, in the language this app is currently showing. See app/src/config. */
export const landingUrl = (locale: string) => `${LANDING_URL}${localeHref(locale)}`;

/** The documentation, which lives at /docs on the landing's origin, in English only. */
export const DOCS_URL = `${LANDING_URL}/docs/`;

export const SOLANA_RPC_ENDPOINT =
  import.meta.env.VITE_SOLANA_RPC_ENDPOINT || "http://127.0.0.1:8899";

/**
 * Whether this build reads mainnet. The catalog lists mainnet stocks only, so on
 * any other cluster they can be browsed but not held, bought, or covered.
 */
export const IS_MAINNET = SOLANA_RPC_ENDPOINT.includes("mainnet");

/**
 * Jupiter's API, which is always mainnet whatever cluster this build reads: live
 * prices, a wallet's mainnet balances, and swaps. None of it touches the stocks
 * program, so it works while that program is on devnet. The keyless endpoint
 * serves browsers directly; set the key only if moving to one that needs it,
 * and note that it ends up in the public bundle.
 */
export const JUPITER_API_URL = (
  import.meta.env.VITE_JUPITER_API_URL?.trim() || "https://lite-api.jup.ag"
).replace(/\/+$/, "");
export const JUPITER_API_KEY = import.meta.env.VITE_JUPITER_API_KEY?.trim() || null;

export const SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT =
  import.meta.env.VITE_SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT || "ws://127.0.0.1:8900";
