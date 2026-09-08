# Heirloom, Documentation

The handbook, prerendered to static HTML. Serves `heirlm.xyz/docs`.

It is a separate package from the landing, and it is **not** a separate origin.
The build lands in the landing's deploy artifact, so the marketing pages and the
docs accumulate to one host rather than splitting authority between an apex and
a `docs.` subdomain. That, and the fact that every page is a finished document
rather than a shell a crawler has to execute, is the whole reason it is built
this way.

It replaced a Mintlify site at `docs.heirlm.xyz`. That hostname is gone rather
than redirected: Workers static assets reject an absolute source in
`_redirects`, and the old site was never crawled, so there was nothing to
preserve. See the note at the bottom of `landing/public/_redirects`.

## What it builds

| Output | |
|---|---|
| `/docs/` | Overview |
| `/docs/<section>/<page>/` | 26 more documents, one file each |
| `/docs/404.html` | |
| `/docs/sitemap-index.xml` | Announced from the landing's `robots.txt` |

English only. The app and the landing are localized into nine languages; the
docs are not, because reference material that is wrong in eight languages is
worse than reference material in one.

## Commands

```bash
bun run dev       # http://localhost:4322/docs/
bun run build     # astro check && astro build → dist/
bun run preview   # serve the production build
```

Or `bun dev:docs` / `bun build:docs` from the repo root.

## Deploying

The docs do not deploy on their own. From the repo root:

```bash
bun run build:site    # builds landing + docs, copies docs/dist → landing/dist/docs
bun run deploy:site   # the above, then wrangler deploy
```

The order matters: the landing's own `astro build` wipes `landing/dist`, so the
docs have to be copied in afterwards. `bun run deploy` inside `landing/` does the
same thing, for the same reason.

## Writing a page

One `.mdx` file per page under `src/content/docs/`. The path is the URL, and the
frontmatter is the sidebar entry:

```mdx
---
title: Estate states
description: Shown under the H1, and used as the meta description.
section: concepts          # one of the ids in src/lib/nav.ts
order: 3                   # position within that section
keywords: ["status", "lifecycle"]   # extra terms the sidebar filter matches
---
```

There is no navigation manifest. `section` and `order` are the whole of it, so
moving a page is a `git mv` plus one frontmatter edit, and a new section means
adding one line to `SECTIONS` in `src/lib/nav.ts`.

### Components available in MDX

Passed in by the route, so no imports are needed:

| | |
|---|---|
| `<Callout type="note \| tip \| warning \| danger" title="…">` | An aside |
| `<Steps>` / `<Step title="…">` | A numbered procedure |
| `<Cards cols={2\|3}>` / `<Card title href icon>` | A grid of links |
| `<Code caption="…">` | A fenced block with a caption bar and a copy button |

`icon` is any [lucide](https://lucide.dev) name — inlined at build time, so no
icon runtime ships.

### Links

Internal links are absolute site paths, e.g. `/docs/concepts/fees/`. They work
in dev too, because the dev server honours the same base.

## Worth knowing

- **`src/styles/docs.css` carries the landing's tokens**, narrowed. The palette
  resolves to the same CSS variables, so a brand change belongs in both files.
  Yellow is the primary accent; lime is reserved for live/active state, which in
  here means the current page in the sidebar and nothing else.
- **The prose styles are written out**, not pulled from
  `@tailwindcss/typography` — the scale is the landing's, and the table, callout
  and code rules would have to be argued out of the plugin anyway.
- **`plugins/rehype-docs.mjs`** adds heading ids and hover anchors, and wraps
  tables in a scroll container. It assigns the ids itself because user rehype
  plugins run *before* Astro's own heading pass, and the anchor needs the slug.
  The `#` glyph is drawn in CSS: a literal text child would end up in every
  table-of-contents entry.
- **Three inline islands, no framework.** The sidebar filter, the table of
  contents scroll-spy, and the code-block copy buttons. Nothing else runs.
- **The favicons and wordmark are duplicated** from `landing/public/`. They are
  reachable at the apex in production, but not from `localhost:4322`.
