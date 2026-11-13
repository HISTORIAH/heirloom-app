import { defineConfig, passthroughImageService } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * <lastmod> from git: a post's last commit, and for the index the newest
 * commit under content/. Git rather than the build clock, which would claim
 * every page changed on every deploy. Needs full history in CI (fetch-depth: 0).
 */
const lastCommit = (/** @type {string} */ path) => {
  try {
    return (
      execFileSync("git", ["log", "-1", "--format=%cI", "--", path], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || undefined
    );
  } catch {
    return undefined;
  }
};
const sourceFor = (/** @type {string} */ url) => {
  const slug = new URL(url).pathname.replace(/^\/blog\/?/, "").replace(/\/$/, "");
  if (!slug) return "src/content/blog";
  return [`src/content/blog/${slug}.mdx`, `src/content/blog/${slug}.md`].find((f) => existsSync(f));
};

export default defineConfig({
  site: "https://heirlm.xyz",
  base: "/blog",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [
    mdx(),
    // Tag pages are noindex (see pages/tag/[tag].astro), so they stay out of
    // the sitemap too: a sitemap should only list what is meant to be indexed.
    sitemap({
      filter: (page) => !page.includes("/blog/tag/"),
      serialize(item) {
        const source = sourceFor(item.url);
        const lastmod = source && lastCommit(source);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: { theme: "github-dark-default", wrap: false },
  },
  // Post images live in src/assets/blog and are referenced relatively from the
  // MDX, so Astro reads each one and writes its real width and height, plus
  // loading="lazy" and decoding="async": no layout shift, nothing below the fold
  // fetched early. Passthrough rather than Sharp, so the build needs no native
  // dependency; that means images aren't re-encoded here. Add them already
  // sized and as WebP (about 1200px wide for screenshots).
  image: { service: passthroughImageService() },
});
