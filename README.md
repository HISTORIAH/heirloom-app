# Heirloom

A Solana-native inheritance protocol. Lock assets into a programmatic estate that transfers to a designated heir if you stop checking in.

## Packages

| Package | What it is | Serves |
|---------|------------|--------|
| [`landing/`](./landing/README.md) | Astro, prerendered in 9 languages | `heirlm.xyz` |
| [`docs/`](./docs/README.md) | Astro + MDX, prerendered handbook | `heirlm.xyz/docs` |
| [`app/`](./app/README.md) | Vite + React SPA, wallet-gated | `app.heirlm.xyz` |
| [`app-ika/`](./app-ika/README.md) | The cross-chain IKA variant | — |
| `waitlist/` | Standalone waitlist page | — |
| `packages/i18n` | Shared copy for all of the above | — |
| `programs/`, `clients/` | Anchor programs and their generated clients | — |

The marketing page and the docs are separate builds on purpose: an SPA hands a
crawler an empty shell, so the content-heavy half of the site is prerendered to
static HTML instead. See [`landing/README.md`](./landing/README.md).

The docs are their own package but not their own origin — `docs/dist` is copied
into `landing/dist/docs` at build time, so `heirlm.xyz` and `heirlm.xyz/docs`
are one host served by one Worker. Deploy both with `bun deploy:site`.

Because the two are separate origins, everything that crosses between them is
explicit: `?lang=` carries the reading language into the app, `?tour=1` starts
the product tour, and a PostHog cookie scoped to `.heirlm.xyz` keeps one visitor
one person. See [Crossing the Origin Boundary](./app/README.md#crossing-the-origin-boundary).

## Programs

| Program | ID | Status |
|---------|----|--------|
| `heirloom` | `heirRS7LknVZiPvnZqEpfcAzFDvXgv96wMH7ByGHukg` | devnet |
| `heirloom-ika` | `9ede3aHXJiv14BNT67MWpgFGugtP1PSdBuLDuRX2D4sf` | devnet |

## Quick start

```bash
# Install dependencies
bun install

# Build the program and regenerate clients
anchor build
bun generate

# Run the app against localnet
bun dev:ui

# Run the marketing site
bun dev:landing

# Run the docs
bun dev:docs

# Build both, assembled as they deploy
bun build:site

# Run tests (requires local validator)
bun test
```

See [`app-ika/README.md`](./app-ika/README.md) for the cross-chain IKA variant.

## Security

The program has been independently audited. For responsible disclosure, contact `info@heirlm.xyz` or DM `@heirloom_app`.
