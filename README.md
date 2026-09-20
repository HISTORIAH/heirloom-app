# Heirloom

A Solana-native inheritance protocol. Lock assets into a programmatic estate that transfers to a designated heir if you stop checking in.

## Structure

| Package | What it is | Serves |
|---------|------------|--------|
| [`landing/`](./landing/README.md) | Astro, prerendered in 9 languages | `heirlm.xyz` |
| [`docs/`](./docs/README.md) | Astro + MDX handbook | `heirlm.xyz/docs` |
| [`blog/`](./blog/) | Astro + MDX blog | `heirlm.xyz/blog` |
| [`app/`](./app/README.md) | Vite + React SPA, wallet-gated | `app.heirlm.xyz` |
| [`app-ika/`](./app-ika/README.md) | The cross-chain IKA variant | — |
| `programs/`, `clients/` | Anchor programs and their generated clients | — |

The content-heavy sites (landing, docs, blog) are prerendered static HTML and
merged into a single Cloudflare Worker at `heirlm.xyz`. The app is a separate
SPA at `app.heirlm.xyz`.

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

# Run the app locally
bun dev:ui

# Run any site locally
bun dev:landing
bun dev:docs
bun dev:blog

# Build all web assets, assembled as they deploy
bun build:web

# Run tests
bun test
```

See [`app-ika/README.md`](./app-ika/README.md) for the cross-chain IKA variant.

## Security

The program has been independently audited. For responsible disclosure, contact `info@heirlm.xyz` or DM `@heirloom_app`.
