// @ts-check
import { execFileSync } from "node:child_process";

/**
 * Stamps each document with the dates git knows for its file: `lastModified`
 * (the latest commit that touched it) and `firstPublished` (the earliest).
 * They feed the visible "Last updated" line, TechArticle's dateModified and
 * datePublished, and the sitemap's <lastmod>.
 *
 * Git is the only honest source here: a build-time `new Date()` would tell
 * crawlers every page changed on every deploy, and they learn to ignore that.
 * A shallow clone knows only its newest commit, so CI must check out with full
 * history (fetch-depth: 0), or every page gets the same date. Without git the
 * fields are simply left out.
 *
 * @param {string} file
 * @returns {{ lastModified?: string, firstPublished?: string }}
 */
export function gitDates(file) {
  try {
    const out = execFileSync("git", ["log", "--follow", "--format=%cI", "--", file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!out) return {};
    const lines = out.split("\n");
    return { lastModified: lines[0], firstPublished: lines[lines.length - 1] };
  } catch {
    return {};
  }
}

export default function remarkGitDates() {
  return (/** @type {any} */ _tree, /** @type {any} */ file) => {
    const path = file.history?.[0];
    if (!path) return;
    const { lastModified, firstPublished } = gitDates(path);
    const frontmatter = file.data.astro.frontmatter;
    if (lastModified) frontmatter.lastModified = lastModified;
    if (firstPublished) frontmatter.firstPublished = firstPublished;
  };
}
