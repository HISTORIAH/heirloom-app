/** Canonical origin for the landing itself. */
export const SITE_URL = "https://heirlm.xyz";

/**
 * The app now lives on its own subdomain. Every call to action on this page is
 * a hand-off across that boundary, so the URLs are collected here rather than
 * spelled out in a dozen components.
 */
export const APP_URL = "https://app.heirlm.xyz";
export const APP_CREATE_VAULT_URL = `${APP_URL}/create-vault`;
/** The app reads ?tour=1 and starts the product tour on arrival. */
export const APP_TOUR_URL = `${APP_URL}/?tour=1`;

export const DOCS_URL = "https://docs.heirlm.xyz/";
export const GITHUB_URL = "https://github.com/HISTORIAH/Heirloom-app";
export const TWITTER_URL = "https://x.com/heirloom_app";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;
