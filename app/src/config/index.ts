import { localeHref } from "@heirloom/i18n";

// The marketing site is a separate Astro build on the apex domain; this app
// serves app.heirlm.xyz. Anything in here that means "go back to the site"
// leaves the origin, so it is a URL rather than a router path.
export const LANDING_URL = (
  import.meta.env.VITE_LANDING_URL?.trim() || "https://heirlm.xyz"
).replace(/\/+$/, "");

/**
 * The landing, in the language the app is currently showing.
 *
 * The two origins each hold the locale their own way — a path prefix there, a
 * localStorage key here — so a visitor who arrived from `/ja/` and clicks Home
 * would otherwise be handed back the English page they never asked for. The
 * inbound half of the same contract is `?lang=`; see `@heirloom/i18n`.
 */
export const landingUrl = (locale: string) => `${LANDING_URL}${localeHref(locale)}`;

export const SOLANA_RPC_ENDPOINT =
  import.meta.env.VITE_SOLANA_RPC_ENDPOINT || "http://127.0.0.1:8899";

export const SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT =
  import.meta.env.VITE_SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT || "ws://127.0.0.1:8900";

export const POSTHOG_PROJECT_TOKEN =
  import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim() || "";

export const ANALYTICS_ENABLED =
  import.meta.env.VITE_ANALYTICS_ENABLED?.trim().toLowerCase() === "true";

// --- Feature flags (temporary — remove once shipped) ---

// TEMP: Yield/staking is on by default. The flows are
// still mocked. Set VITE_FEATURE_YIELD_STAKING_UI=false to hide them.
// TODO: Flip back to opt-in (or delete) once the strategies are wired to real programs.
export const FEATURE_YIELD_STAKING_UI =
  import.meta.env.VITE_FEATURE_YIELD_STAKING_UI?.trim().toLowerCase() !== "false";

// TEMP: Notifications UI doesn't have backend wired up
// TODO: Remove this flag once the notifications backend is live.
export const FEATURE_NOTIFICATIONS_UI =
  import.meta.env.VITE_FEATURE_NOTIFICATIONS_UI?.trim().toLowerCase() === "true";
