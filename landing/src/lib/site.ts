import { appHref } from "@heirloom/i18n/landing";

/** Canonical origin for the landing itself. */
export const SITE_URL = "https://heirlm.xyz";

/**
 * The app now lives on its own subdomain. Every call to action on this page is
 * a hand-off across that boundary, so the URLs are built here rather than
 * spelled out in a dozen components.
 *
 * They are functions of the locale because nothing else carries it across: the
 * language a visitor is reading in is a path prefix on this origin and a
 * localStorage key on the app's, and neither origin can see the other's. The
 * `?lang=` these append is the whole of that contract — the app reads it once
 * on arrival, stores it, and strips it.
 */
export const APP_URL = "https://app.heirlm.xyz";

/** Any route on the app, with the reading language attached. */
export const appPath = (path: string, locale: string) => appHref(APP_URL, path, locale);

/** The app's home. Its router opens the dashboard. */
export const appUrl = (locale: string) => appPath("/dashboard", locale);

export const appCreateVaultUrl = (locale: string) => appPath("/create-vault", locale);

/**
 * The app reads `?tour=1` and starts the product tour on arrival. It points at
 * `/dashboard` rather than the app root so the hand-off costs one request
 * instead of a redirect the tour's first step would only undo.
 */
export const appTourUrl = (locale: string) => {
  const url = appUrl(locale);
  return `${url}${url.includes("?") ? "&" : "?"}tour=1`;
};

/**
 * The documentation is its own package (`docs/`), an Astro build folded into
 * this one's deploy artifact under /docs. It is a path rather than a subdomain
 * on purpose: the handbook and the marketing page accumulate to one host
 * instead of splitting authority across two.
 */
export const DOCS_PATH = "/docs/";
export const DOCS_URL = `${SITE_URL}${DOCS_PATH}`;
/** The blog is the same kind of neighbour: `blog/` built and copied in under /blog. */
export const BLOG_PATH = "/blog/";
export const BLOG_URL = `${SITE_URL}${BLOG_PATH}`;
export const GITHUB_URL = "https://github.com/HISTORIAH/Heirloom-app";
export const TWITTER_URL = "https://x.com/heirloom_app";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;
