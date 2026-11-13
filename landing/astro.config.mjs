// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { execFileSync } from "node:child_process";

const SITE = "https://heirlm.xyz";

/**
 * Each locale's copy lives in one file in the shared i18n package, so that
 * file's last commit is the honest <lastmod> for its page. Git, not the build
 * clock: a date that changes on every deploy teaches crawlers to ignore it.
 * Needs full git history in CI (fetch-depth: 0).
 */
const LOCALE_FILES = "../packages/i18n/src/locales/landing";
const lastCommit = (/** @type {string} */ file) => {
  try {
    return (
      execFileSync("git", ["log", "-1", "--format=%cI", "--", file], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || undefined
    );
  } catch {
    return undefined;
  }
};
/** "/zh-cn/" → "zh-CN"; "/" → "en". Mirrors the `locales` map below. */
const PATH_LOCALES = /** @type {Record<string, string>} */ ({
  "": "en",
  es: "es",
  pt: "pt",
  ja: "ja",
  ko: "ko",
  vi: "vi",
  tr: "tr",
  "zh-cn": "zh-CN",
  "zh-tw": "zh-TW",
});

// The landing is fully static: every locale is prerendered at build time so a
// crawler gets the finished document instead of an empty shell. That is the
// whole reason it lives outside the Vite app.
//
// Locale paths are lowercased BCP-47 codes ("zh-cn"), and English is served
// unprefixed at the root. The code <-> path mapping lives in the shared
// package, at @heirloom/i18n/landing.
export default defineConfig({
  site: SITE,
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [
    sitemap({
      serialize(item) {
        const segment = new URL(item.url).pathname.split("/")[1] ?? "";
        const code = PATH_LOCALES[segment];
        const lastmod = code && lastCommit(`${LOCALE_FILES}/${code}.ts`);
        if (lastmod) item.lastmod = lastmod;
        // Keep the sitemap's alternates identical to the <link rel="alternate">
        // set in Layout.astro: x-default, plus Hong Kong and Macau readers of
        // Traditional Chinese pointed at /zh-tw/ rather than at English.
        if (item.links?.length) {
          item.links.push(
            { lang: "zh-HK", url: `${SITE}/zh-tw/` },
            { lang: "zh-MO", url: `${SITE}/zh-tw/` },
            { lang: "x-default", url: `${SITE}/` },
          );
        }
        return item;
      },
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en",
          "zh-cn": "zh-CN",
          "zh-tw": "zh-TW",
          ko: "ko",
          ja: "ja",
          es: "es",
          pt: "pt",
          vi: "vi",
          tr: "tr",
        },
      },
    }),
  ],
  vite: {
    // @heirloom/i18n is consumed as source from packages/, outside this app's
    // root — the same pre-bundling exclusion the Vite app carries, for the
    // same reason (stale locale caches serving raw keys).
    optimizeDeps: { exclude: ["@heirloom/i18n"] },
    server: { watch: { ignored: ["!**/packages/i18n/src/**"] } },
  },
});
