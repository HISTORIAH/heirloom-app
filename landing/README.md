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
| `/sitemap-index.xml` | generated, with per-locale alternates |
| `_redirects` | old app paths 301 → `app.heirlm.xyz` |
| `_headers` | immutable caching for `/_astro/*` |

Ten documents, ~17 KB gzipped each, ~2.7 KB of JavaScript in total.

## Commands

```bash
bun run dev           # http://localhost:4321
bun run build         # astro check && astro build → dist/
bun run preview       # serve the production build
bun run deploy        # build, then wrangler deploy
```

Or `bun dev:landing` / `bun build:landing` from the repo root.

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
- **`src/styles/global.css`** is duplicated from `app/src/index.css` on purpose.
  The two surfaces share a design system and have to line up; a change to one
  usually belongs in both.
- **`_headers` rules append**, they do not override. Two rules setting
  `Cache-Control` on overlapping paths emit both, and the first wins.
- **Sections** are one `.astro` file each in `src/components/sections/`, 1:1
  with the React components they replaced. Class strings are copied rather than
  rewritten.
