import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://heirlm.xyz",
  base: "/blog",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [
    mdx(),
    // Tag pages are noindex (see pages/tag/[tag].astro), so they stay out of
    // the sitemap too: a sitemap should only list what is meant to be indexed.
    sitemap({ filter: (page) => !page.includes("/blog/tag/") }),
  ],
  markdown: {
    shikiConfig: { theme: "github-dark-default", wrap: false },
  },
});
