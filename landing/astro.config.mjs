// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// The landing is fully static: every locale is prerendered at build time so a
// crawler gets the finished document instead of an empty shell. That is the
// whole reason it lives outside the Vite app.
//
// Locale paths are lowercased BCP-47 codes ("zh-cn"), and English is served
// unprefixed at the root. See src/lib/i18n.ts for the code <-> path mapping.
export default defineConfig({
  site: "https://heirlm.xyz",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [
    sitemap({
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
