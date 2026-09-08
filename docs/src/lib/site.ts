/**
 * The docs are a third surface on a two-origin product. Everything that points
 * off this build is spelled out here rather than written into a component.
 */

/** Canonical origin. The docs live on the apex, under /docs. */
export const SITE_URL = "https://heirlm.xyz";

/** The marketing site. Same origin as the docs, so links to it are paths. */
export const LANDING_URL = SITE_URL;

/** The app is a separate origin; every link to it leaves this one. */
export const APP_URL = "https://app.heirlm.xyz";

export const GITHUB_URL = "https://github.com/HISTORIAH/Heirloom-app";
export const TWITTER_URL = "https://x.com/heirloom_app";
export const CONTACT_EMAIL = "info@heirlm.xyz";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

/** Where the "Edit this page" link on every document points. */
export const GITHUB_EDIT_BASE = `${GITHUB_URL}/edit/main/docs/src/content/docs`;

/** Devnet program and treasury, from the on-chain crate's constants. */
export const PROGRAM_ID = "heirRS7LknVZiPvnZqEpfcAzFDvXgv96wMH7ByGHukg";
export const IKA_PROGRAM_ID = "9ede3aHXJiv14BNT67MWpgFGugtP1PSdBuLDuRX2D4sf";
export const TREASURY_ADDRESS = "tr31o8FF9v2rEukh84ZwjRQgYa3x74PHssighePMP1Q";

/**
 * Astro serves this build under a base path, so no internal link may be
 * written bare. `base` is "/docs"; `withBase("/")` is the docs home.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const withBase = (path: string) => `${BASE}/${path.replace(/^\//, "")}`;

/** A doc entry's id ("concepts/estate", or "index") as a site path. */
export const docHref = (id: string) => (id === "index" ? `${BASE}/` : `${BASE}/${id}/`);

/** Any route on the app. */
export const appPath = (path: string) => `${APP_URL}${path}`;
