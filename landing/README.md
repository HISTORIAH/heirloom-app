# Heirloom, Landing Site

The marketing page, prerendered to static HTML in nine languages. Serves `heirlm.xyz`.

It is a separate package because an SPA hands a crawler an empty shell. Astro
renders every locale at build time, so the finished document is what gets
served — and no framework ships with it. The only JavaScript is four small
inline islands — the mobile nav, the demo dialog, the FAQ accordion, the
language menu — plus an analytics bootstrap that compiles away to nothing when
analytics is off.

## What it builds

| Output | |
|---|---|
| `/` | English, unprefixed |
| `/es/` `/pt/` `/ja/` `/ko/` `/vi/` `/tr/` `/zh-cn/` `/zh-tw/` | one document each, with `hreflang` alternates |
| `/404.html` | not a SPA fallback — unknown paths 404 |
| `/sitemap-0.xml` | generated, with per-locale `hreflang` alternates (plus `x-default`, `zh-HK`/`zh-MO`) and a git-dated `<lastmod>` |
| `/sitemap.xml` | hand-written index of the landing, docs and blog sitemaps; the one URL submitted to Search Console |
| `robots.txt` | the whole crawl policy for the apex; Cloudflare's Managed robots.txt must stay off |
| `llms.txt`, `.well-known/security.txt` | a plain index for AI tools, and the RFC 9116 security contact (renew `Expires` yearly) |
| `_redirects` | old app paths 301 → `app.heirlm.xyz`; renamed docs pages and slashless entry points 301 |
| `docs/` | not built here — copied in from the `docs` package, see below |
| `_headers` | immutable caching for `/_astro/*` |

Ten documents, ~17 KB gzipped each, ~2.7 KB of JavaScript in total.

## Commands

```bash
bun run dev           # http://localhost:4321
bun run build         # astro check && astro build → dist/
bun run preview       # serve the production build
bun run deploy        # build landing + docs, then wrangler deploy
```

Or `bun dev:landing` / `bun build:landing` from the repo root.

## The docs ride along

`heirlm.xyz/docs` is a separate package ([`docs/`](../docs/README.md)) that
builds to its own `dist` and is copied into `landing/dist/docs` afterwards. One
origin, one Worker, one deploy — and the handbook feeds the same host the
marketing pages rank on instead of a subdomain of its own.

`bun run build` here wipes `dist/`, which is why deploying goes through
`bun build:web` at the repo root rather than `astro build` alone. Deploy with
`bun deploy:web`, or `bun run deploy` here, which calls it.

## Environment

Analytics stays out of the bundle entirely unless both are set at build time.
See `.env.example`.

```env
PUBLIC_ANALYTICS_ENABLED=true
PUBLIC_POSTHOG_PROJECT_TOKEN=
PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Worth knowing

- **Copy** lives in `@heirloom/i18n/landing`, not in the components. There is no
  React here, so it uses a plain `createLandingT(locale)` that falls back to
  English key by key — never the i18next entry point next door.
- **Links into the docs go to the page that explains the section**, built by
  `docsHref()` in `src/lib/site.ts`, with anchor text that says what is there.
  Their labels are locale keys (`howItWorks.docsLink` and friends).
- **Every link to the app carries the locale.** They are built by
  `src/lib/site.ts` (`appPath`, `appUrl`, `appCreateVaultUrl`, `appTourUrl`),
  never written out by hand, because the app is a separate origin and a path
  prefix means nothing there. The parameter is `?lang=`, English omits it, and
  the app reads it once on arrival and strips it. The tour link points straight
  at `/dashboard?tour=1` so the hand-off costs one request rather than a
  redirect. Both halves of the contract live in `@heirloom/i18n`
  (`appHref` / `takeLocaleFromUrl`).
- **`src/styles/global.css`** is duplicated from `app/src/index.css` on purpose.
  The two surfaces share a design system and have to line up; a change to one
  usually belongs in both. Only the mosaic's own metrics (`--head-h`,
  `--row-unit`, `--mosaic-gap`) are meant to differ.
- **`_headers` rules append**, they do not override. Two rules setting
  `Cache-Control` on overlapping paths emit both, and the first wins.
- **Sections** are one `.astro` file each in `src/components/sections/`, 1:1
  with the React components they replaced. Class strings are copied rather than
  rewritten.
