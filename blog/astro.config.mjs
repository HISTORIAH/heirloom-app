import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://heirlm.xyz",
  base: "/blog",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: { theme: "github-dark-default", wrap: false },
  },
});
