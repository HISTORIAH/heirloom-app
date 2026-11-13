import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { SECTIONS } from "./lib/nav";

/**
 * One collection, one file per page. `section` and `order` are what the
 * sidebar is built from — there is no separate navigation manifest to keep in
 * step with the filesystem.
 */
const docs = defineCollection({
  loader: glob({ base: "./src/content/docs", pattern: "**/*.mdx" }),
  schema: z.object({
    title: z.string(),
    /** Also the page's meta description and the lede under the H1. */
    description: z.string(),
    /**
     * The search result's title, when the sidebar label alone ("Fees", "Errors")
     * says too little to a searcher. Written whole: nothing is appended. Aim for
     * 50–60 characters. Defaults to `${title} | Heirloom Docs`.
     */
    seoTitle: z.string().max(65).optional(),
    /**
     * The search snippet, when `description` (written as a short lede) is too
     * thin for one. Aim for 120–160 characters. Defaults to `description`.
     */
    metaDescription: z.string().max(170).optional(),
    /** The H1, when it should differ from the sidebar label in `title`. */
    heading: z.string().optional(),
    section: z.enum(SECTIONS.map((s) => s.id) as [string, ...string[]]),
    order: z.number(),
    /** Extra terms the sidebar filter should match this page on. */
    keywords: z.array(z.string()).default([]),
  }),
});

export const collections = { docs };
