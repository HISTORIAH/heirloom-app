import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    author: z.string().default("Heirloom Team"),
    authorBio: z.string().optional(),
    featured: z.boolean().default(false),
    cover: z.string().optional(),
    canonical: z.string().url().optional(),
  }),
});

export const collections = { blog };
