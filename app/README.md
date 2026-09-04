# Heirloom, Web Application

**The only interface Alice ever sees. The one that turns a PDA into a promise.**

> **The marketing site is not in this package.** It was extracted to
> [`landing/`](../landing/README.md) as a prerendered Astro build and serves
> `heirlm.xyz`; this app serves `app.heirlm.xyz`. Every route in here is
> wallet-gated, per-user, and `noindex` — `/` redirects to `/dashboard`.

## Overview

This package is the user-facing React application for Heirloom. It is a single-page app that lets anyone connect a Solana wallet, open an estate for a named heir, fund it with SOL and SPL tokens, keep it alive with periodic heartbeats (from the authority key or an optional hot signer), pause the clock through a trusted delegate, and, when the time comes, claim the assets as the heir.

An estate has **one heir** and **any number of registered assets**. Every asset the owner registers goes to that heir on claim.

It is deliberately thin. It does not run business logic of its own, it does not cache on-chain state in any authoritative way, and it does not hide the contract from the user. Every meaningful action becomes a Solana transaction that the user signs with their own wallet. The app's job is to make that transaction easy to understand and impossible to get wrong.

## Tagline

> One wallet. One heir. One transaction away from done.

## Where This Fits

```
   ┌──────────────────────────────────────────────┐
   │                  app  (this package)         │
   │                                              │
   │   React components ─▶ services/heirloom.ts   │
   │                              │               │
   │                              ▼               │
   │                     lib/heirloom/            │
   │              (PDAs, instruction builders,    │
   │               sign-and-send)                 │
   │                              │               │
   │                              ▼               │
   │                   @historiah/heirloom (JS)   │
   │                              │               │
   └──────────────────────────────┼───────────────┘
                                  │
                                  ▼
                       Solana RPC / wallet signer
                                  │
                                  ▼
                         Heirloom on-chain program
                heirRS7LknVZiPvnZqEpfcAzFDvXgv96wMH7ByGHukg
```

The app never imports Solana program logic directly. It imports the **generated JS client** (`@historiah/heirloom`, a Bun workspace package under `clients/heirloom/js/`), which exposes typed instruction builders, account codecs, PDA derivers, and error decoders for every instruction the on-chain program supports. When the program changes, regenerating the client propagates the new shape into this package as a TypeScript type change at compile time.

## Technology Stack

- **React 18** with function components and hooks throughout.
- **TypeScript 5.6**, strict mode.
- **Vite 6** for dev server and production bundling; **Bun** as package manager, **Turborepo** for the workspace.
- **React Router v6** for routing.
- **TanStack Query** for server-state caching of RPC reads.
- **Tailwind CSS 3** + **tailwindcss-animate** for styling, with Radix UI primitives (`Dialog`, `Toast`, `Tooltip`, `Slot`) wrapping accessible behavior.
- **lucide-react** for iconography, **sonner** for transient toasts, **react-helmet-async** for per-route head tags.
- **`@heirloom/i18n`** (workspace package) for copy, via the `app` namespace. Nine locales; English is the source of truth.
- **`react-joyride`** for the product tour, which the landing hands off to with `?tour=1`.
- **`posthog-js`** for optional, anonymous product analytics.
- **`@solana/kit` v7** as the Solana SDK — tree-shakable, codec-based, and the native runtime of the generated client.
- **`@wallet-ui/react`** for wallet discovery, connection UX, and signer adapters.
- **`@solana-program/system`**, **`@solana-program/token`**, and **`@solana-program/token-2022`** for System and SPL Token instruction builders used alongside Heirloom instructions.
- **`gill`** for RPC convenience.
- **Helius DAS API** (optional) for SPL token metadata, symbols, and images.
- **`@historiah/heirloom`**, the generated Heirloom client, wired as `workspace:*`.

## Directory Layout

```
app/
├── index.html                  App shell. No marketing copy, noindex.
├── vite.config.ts              Alias: "@" → "./src"
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json               References app + node configs
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
├── wrangler.jsonc              Cloudflare, app.heirlm.xyz, SPA fallback
├── package.json
├── public/                     favicons, manifest, robots.txt (Disallow: /)
└── src/
    ├── main.tsx                Root: Helmet → i18n → Analytics → App
    ├── App.tsx                 Providers + router + per-route <Seo>
    ├── index.css               Tailwind entry, design tokens, editorial scale
    ├── vite-env.d.ts
    │
    ├── pages/                  Route-level components
    │   ├── CreateVault.tsx     Four-step estate creation wizard
    │   ├── Dashboard.tsx       Owner's estate list, assets, management
    │   ├── Claim.tsx           Heir flow with auto-discovery
    │   ├── Defer.tsx           Delegate pause flow
    │   ├── Heartbeat.tsx       Hot signer (hb_signer) heartbeat flow
    │   └── NotFound.tsx
    │
    ├── components/
    │   ├── PageHeader.tsx      App chrome; its Home link leaves for heirlm.xyz
    │   ├── VaultMark.tsx       The Heirloom mark, used as the empty state
    │   ├── WalletConnectDialog.tsx
    │   ├── WithWallet.tsx      Render-prop gate that supplies the signer
    │   ├── TokenAvatar.tsx     Presentational token icon, initial, or fallback
    │   ├── ConfirmDialog.tsx   Destructive-action confirmation
    │   ├── Seo.tsx             Per-route head tags; noindex throughout
    │   ├── app/                AppNavLinks — the shared destination list
    │   ├── create-vault/       Heir → Deposit → Heartbeat → Review, plus
    │   │                       stepper, timeline, and summary column
    │   ├── dashboard/          Estate cards, asset panels, yield + settings
    │   ├── portal/             PortalLayout + EstateGlance, for the three
    │   │                       single-purpose flows (claim/defer/heartbeat)
    │   ├── surface/            Panel, Modal, OptionCard, PercentRow, tones
    │   ├── tour/               AppTour (joyride) + tourSteps
    │   └── ui/                 Radix-based primitives
    │       ├── button.tsx      cva variants; the flat set is shared with the landing
    │       ├── dialog.tsx
    │       ├── tooltip.tsx
    │       ├── toast.tsx
    │       ├── toaster.tsx
    │       └── sonner.tsx
    │
    ├── contexts/
    │   ├── WalletContext.tsx   RPC singletons + wallet-ui bridge
    │   ├── VaultContext.tsx    Estate discovery, polling, on-chain actions
    │   ├── TourContext.tsx     Tour run/step state, shared across routes
    │   └── AnalyticsContext.tsx PostHog, dormant unless configured
    │
    ├── hooks/
    │   ├── use-mobile.tsx
    │   ├── use-toast.ts
    │   ├── useTokenBalances.ts   SOL + USDC for the connected wallet
    │   ├── useTokenMetadata.ts   DAS metadata fetcher with in-memory cache
    │   ├── useWalletSplTokens.ts Wallet's SPL holdings, for deposit pickers
    │   └── useDominantColor.ts   Samples a token icon to tint its row
    │
    ├── services/
    │   ├── heirloom.ts         The only module that talks to the client
    │   ├── das.ts              Typed Helius DAS helpers (getAssetBatch, byOwner)
    │   └── api/notifications.ts Placeholder — the backend is not wired up
    │
    ├── lib/
    │   ├── heirloom/
    │   │   ├── client.ts       sendTx: build, sign, send, return a signature
    │   │   ├── pdas.ts         estate / vault / asset-record / ATA derivation
    │   │   └── instructions.ts Instruction builders, one per program action
    │   ├── analytics.ts        PostHog init + capture wrappers
    │   ├── constants.ts        Labels, decimals, time units, PostHog host
    │   ├── strategies.ts       Yield strategy helpers (currently mocked)
    │   ├── yieldTokens.ts      Yield-eligible token registry (placeholder APYs)
    │   └── utils/              cn, format, math, solana, token
    │
    ├── config/
    │   └── index.ts            RPC endpoints, landing URL, analytics, flags
    │
    └── types/                  Shared types, analytics events, strategy UI
```

Three files are currently orphaned and imported by nothing: `components/WalletPill.tsx`, `components/NavLink.tsx`, and `components/ErrorBoundary.tsx`.

## Routing

All routes are declared in `src/App.tsx`:

| Path            | Component         | Purpose                                                                |
| --------------- | ----------------- | ---------------------------------------------------------------------- |
| `/`             | redirect          | Sends to `/dashboard`. The landing lives on `heirlm.xyz`.              |
| `/create-vault` | `CreateVault`     | Wizard to open an estate and fund it with SOL and/or tokens.           |
| `/dashboard`    | `Dashboard`       | Owner view: estates, state, assets, yield, heartbeat, settings.        |
| `/claim`        | `Claim`           | Heir view: auto-discover claimable estates and pull the assets.        |
| `/defer`        | `Defer`           | Delegate view: pause an owner's heartbeat clock.                       |
| `/heartbeat`    | `Heartbeat`       | Hot signer view: registered `hb_signer` refreshes the heartbeat.       |
| `*`             | `NotFound`        | 404.                                                                   |

`RouteSeo` sets the title per path and stamps `noindex, nofollow` on every one of them.

## Provider Stack

Composed across `main.tsx` and `App.tsx`, outer to inner:

1. `HelmetProvider` — per-route head tags
2. `I18nProvider` — i18next, from `@heirloom/i18n`
3. `AnalyticsProvider` — PostHog, or an inert stub when unconfigured
4. `QueryClientProvider` — TanStack Query
5. `TooltipProvider` — Radix
6. `WalletUi` with a `createWalletUiConfig({ clusters })` list ordered by the configured RPC endpoint (mainnet, localnet, or devnet first)
7. `WalletProvider` — RPC singletons and the current address
8. `VaultProvider` — estate discovery, polling, and on-chain write wrappers
9. `BrowserRouter` → `TourProvider` → `AppTour`

Toast surfaces (`Toaster`, `Sonner`) mount inside the wallet/vault providers so any action can fire a notification. `@wallet-ui/react`'s stylesheet is injected as a raw string into a `<style id="wallet-ui-css">` tag at module load.

## How the App Integrates with the Client and the Program

### The single gateway: `src/services/heirloom.ts`

This module is the only place where the app touches `@historiah/heirloom`. Under it, `src/lib/heirloom/` splits the mechanics three ways: `pdas.ts` derives addresses, `instructions.ts` builds instructions, and `client.ts` exposes one `sendTx(client, feePayer, ix | ix[])` that pipes a v0 transaction message through `@solana/kit` and returns a base58 signature.

**Writes.** Each is an `async` function taking the client, a signer, and typed args:

- `initialize` and `initializeWithTokens` — open an estate, optionally bundling one `register_asset` per extra token into the same transaction.
- `updateFields` — heartbeat refresh, and the setter for interval / grace / pause duration / label. Signer may be the authority or the registered `hb_signer`.
- `registerAsset` and `registerSolDeposit` — add an SPL token or top up SOL on a live estate.
- `depositSol` and `depositToken` — plain transfers into an already-registered asset.
- `revoke` / `revokeAll` — the owner's emergency withdraw.
- `claim` / `claimAll` — the heir's claim.
- `delegateDefer` — the guardian's one-time pause.
- `updateHeirAll` — re-derives estate and vault PDAs for the new heir and migrates registered token accounts.

The `*All` variants order **tokens before SOL**, because the SOL path closes the vault. The program closes the estate and vault PDAs inline once the last asset clears, returning rent.

**Reads.**

- `fetchEstateByPair` fetches one estate by (authority, heir) via `fetchMaybeEstate`.
- `fetchEstatesByAuthority` / `fetchEstatesByHeir` use `getProgramAccounts` with `memcmp` filters on the Estate discriminator and the relevant offset, then decode with the generated `decodeEstate`. The heir variant powers auto-discovery on `/claim`, so an heir never needs to know the owner's address.
- `fetchVaultClaimableLamports` returns the raw lamport balance minus the rent-exempt reserve, so the UI shows real deposits rather than rent overhead.
- `discoverVaultTokenAccounts` calls `getTokenAccountsByOwner(vaultPda)` with `jsonParsed` encoding, filtering out zero-balance accounts.
- `buildSnapshotFromEstate` / `lookupEstateSnapshot` assemble the denormalized `EstateSnapshot` the portal pages render.

**Lifecycle.** `computeEstateState({ lastHeartbeat, heartbeatInterval, gracePeriod, pausedUntil, createdAt, vaultEmpty })` returns `active | grace | claimable | distributed` plus the two countdowns. It anchors on `lastHeartbeat`, falling back to `createdAt` when the estate has never beaten, and takes `max(graceDeadline + gracePeriod, pausedUntil)` as the claimable moment so a delegate's pause is respected. An empty vault reads as `distributed`.

### The generated client

`clients/heirloom/js/src/main.ts` re-exports everything from `generated/`, the `TREASURY_ADDRESS` constant, and a hand-written `findAssetRecordPda` (marked `FIXME` until Codama emits it). Because the codecs are generated directly from the Anchor IDL, they match the on-chain wire format as-is — no hand-written overrides are required.

### State layer: `VaultContext`

`src/contexts/VaultContext.tsx` is where on-chain reality becomes UI reality. It:

- Polls `fetchEstatesByAuthority` every 15 seconds, or every 5 seconds while a create is pending, and assembles an `EstateData[]` with denormalized fields: unwrapped `delegate` and `hbSigner` options, SOL balance, discovered vault tokens, `claimableAssets` count, lifecycle state, and both countdowns.
- Exposes action callbacks (`createEstateOnChain`, `registerAssetOnChain`, `registerSolOnChain`, `depositSolOnChain`, `depositTokenOnChain`, `sendHeartbeatOnChain`, `updateEstateFieldsOnChain`, `revokeEstateOnChain`, `updateHeirOnChain`) that call into `services/heirloom.ts` and track the last pending signature.
- Handles the "stale PDA" edge case in `createEstateOnChain`: after a revoke, the runtime garbage-collects zero-lamport PDAs at transaction end, but RPC snapshots can lag. The provider polls `getAccountInfo` for up to 20 seconds before retrying `initialize`, then surfaces `"Prior estate/vault PDAs not yet cleared on-chain."`.

### Wallet layer: `WalletContext` and `WithWallet`

`src/contexts/WalletContext.tsx` creates one `createSolanaRpc(SOLANA_RPC_ENDPOINT)` and one `createSolanaRpcSubscriptions(SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT)` at module scope; both are referentially stable singletons, and their types (`AppRpc`, `AppRpcSubscriptions`) are exported for the service layer. It reads the connected account from `useWalletUi()` and exposes `{ isConnected, publicKey, address, rpc, rpcSubscriptions, disconnectWallet }`.

The signer comes from `WithWallet`, a render-prop component that calls `useWalletUiSigner()` only once an account exists — the hook requires a non-null account, so pages stay fully viewable while disconnected and only their *actions* are gated.

### Token metadata: Helius DAS

`src/services/das.ts` wraps the Helius `getAssetBatch` and `getAssetsByOwner` endpoints, chunking batches at 1,000 ids and preferring `cdn_uri` for images. `useTokenMetadata` batches mints, caches results in memory, and is called at the screen level — `EstateCard` and `Claim` — which then pass a resolved `image` down. `TokenAvatar` itself fetches nothing: given an image it renders it, and otherwise falls back to the symbol's initial or a coin glyph.

There is no separate Helius key: DAS is served from whatever `VITE_SOLANA_RPC_ENDPOINT` points at. Against a plain public RPC the DAS calls fail and the UI falls back to truncated mint addresses.

### Configuration: `src/config/index.ts`

```ts
LANDING_URL                     = VITE_LANDING_URL                      || "https://heirlm.xyz"
SOLANA_RPC_ENDPOINT             = VITE_SOLANA_RPC_ENDPOINT              || "http://127.0.0.1:8899"
SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT = VITE_SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT || "ws://127.0.0.1:8900"
POSTHOG_PROJECT_TOKEN           = VITE_POSTHOG_PROJECT_TOKEN            || ""
ANALYTICS_ENABLED               = VITE_ANALYTICS_ENABLED === "true"
FEATURE_YIELD_STAKING_UI        = VITE_FEATURE_YIELD_STAKING_UI !== "false"   // on by default
FEATURE_NOTIFICATIONS_UI        = VITE_FEATURE_NOTIFICATIONS_UI === "true"    // off by default
```

The program ID and treasury address are not configurable here — they come from the generated client. Non-environment constants (token labels, decimals, `LABEL_MAX_LEN`, time units, the PostHog host, the devnet USDC mint) live in `src/lib/constants.ts`.

**Both feature flags are temporary.** The yield and staking flows render against `lib/strategies.ts` placeholder generators and the placeholder APYs in `lib/yieldTokens.ts`; no strategy is wired to a real program yet. `services/api/notifications.ts` is an empty placeholder, which is why the notifications flag defaults off.

### Product analytics: PostHog

Analytics is dormant by default and initializes only when `VITE_ANALYTICS_ENABLED` is exactly `true` **and** a project token is present. The ingestion host is a fixed constant in `src/lib/constants.ts`.

```env
VITE_ANALYTICS_ENABLED=false
VITE_POSTHOG_PROJECT_TOKEN=
```

`src/types/index.ts` holds the closed `AnalyticsEvent` union — wallet, vault, heartbeat, claim, defer, top-up, asset, heir-reassign, emergency-withdraw, and tour events — so a typo in a capture call fails to compile. The integration records SPA page views and clicks on links and buttons. It deliberately does not identify wallet owners or send wallet addresses, heir addresses, transaction signatures, asset amounts, form values, or error messages. Autocaptured text is masked and session recording is disabled.

## Alice, Concretely

The base README introduces Alice, who wants her daughter Mia to inherit her SOL. Here is exactly what her fingers do:

1. Opens `heirlm.xyz`, reads the landing (a separate Astro build — see [`landing/`](../landing/README.md)), and clicks **Launch App**, which brings her to `app.heirlm.xyz`. Had she taken **Launch Tour**, she would arrive at `?tour=1` and `AppTour` would open the walkthrough on the dashboard.
2. Clicks **Connect Wallet** in `PageHeader`. `WalletConnectDialog` opens, powered by `@wallet-ui/react`. Once connected, the header shows her address with copy and change-wallet affordances.
3. Navigates to `/create-vault`. The wizard runs four steps — **Heir** (address, label, optional delegate), **Deposit** (SOL amount and any token deposits), **Heartbeat** (interval, grace period, pause duration, optional `hb_signer`), **Review**. On submit it calls `vault.createEstateOnChain(input)`, which routes through `initializeWithTokens` to bundle `initialize` and every `register_asset` deposit into a single transaction.
4. On `/dashboard`, `EstateCard` renders her estate: `state: active`, `secondsUntilGrace`, the vault SOL balance, and any SPL holdings discovered via `discoverVaultTokenAccounts`, with symbols and icons resolved in one `useTokenMetadata` batch. Destructive actions route through `ConfirmDialog`.
5. She clicks **Send Heartbeat**, which calls `sendHeartbeatOnChain(heir)` → `updateFields` with every field `null`. The program reads null-everything as "just reset `last_heartbeat`".
6. From her phone wallet she opens `/heartbeat`, enters her authority and Mia's address; the page looks up the estate, checks that her connected wallet matches the registered `hb_signer`, and lets her sign the same transaction without her cold key.
7. For her retreat, Bob opens `/defer`, enters the same pair, and triggers `delegateDefer`. The estate's `paused_until` advances by the configured pause duration.
8. If the worst happens, Mia visits `/claim`. The page calls `fetchEstatesByHeir(heirAddress)` and lists every estate naming her. She picks one, signs once, and `claimAll` bundles the token claims followed by the SOL claim in a single transaction — tokens first, because the SOL claim closes the vault. The assets land in her accounts minus the 0.75% protocol fee per asset.

Every step is one signed transaction. Every failure surfaces as a `sonner` toast with an Explorer link.

## Running the App

From the repo root (preferred, so Turborepo handles the client dependency):

```bash
bun install
bun dev:ui            # turbo run dev --filter=app
bun build:ui
```

Or from within `app/`:

```bash
bun run dev           # Vite on http://localhost:5173
bun run build         # tsc -b && vite build → dist/
bun run preview       # serve the production build
bun run lint          # ESLint (flat config)
```

To see the landing beside it, run `bun dev:landing` from the root.

### Environment Variables

Copy `.env.example` to `.env.local` (git-ignored) and fill it in:

```env
VITE_SOLANA_RPC_ENDPOINT=https://devnet.helius-rpc.com/?api-key=<HELIUS_API_KEY>
VITE_SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT=wss://devnet.helius-rpc.com/?api-key=<HELIUS_API_KEY>

# Where "Home" and a skipped tour go
VITE_LANDING_URL=https://heirlm.xyz

# PostHog. Leave disabled unless privacy and consent controls are in place.
VITE_ANALYTICS_ENABLED=false
VITE_POSTHOG_PROJECT_TOKEN=

# Temporary feature flags — local only, the flows behind them are mocked
VITE_FEATURE_YIELD_STAKING_UI=true
VITE_FEATURE_NOTIFICATIONS_UI=true
```

Without an RPC endpoint the app targets a local validator at `127.0.0.1:8899`. Vite exposes any `VITE_`-prefixed variable through `import.meta.env`.

### Regenerating the Client After a Program Change

If the on-chain program's IDL changes, run from the repo root:

```bash
bun generate          # or bun generate:heirloom for just this program
```

That rebuilds `clients/heirloom/js/src/generated/`. Because `@historiah/heirloom` is a `workspace:*` dependency, the app picks up the change on the next Vite reload. Any broken type contracts show up in `tsc` before they show up in the browser.

## Conventions

- Path alias `@/` maps to `src/` (configured in `vite.config.ts` and mirrored in `tsconfig.app.json`).
- Components are PascalCase `.tsx`; hooks are kebab- or camel-cased; everything in `lib/`, `services/`, `config/`, and `types/` is plain `.ts` unless it renders.
- Styling is Tailwind-first. The `cn` helper in `lib/utils/cn.ts` merges conditional class strings via `clsx` + `tailwind-merge`.
- All user-visible copy goes through `useTranslation("app")` from `@heirloom/i18n`. Never inline a string — add it to `packages/i18n/src/locales/app/en.ts` first.
- Keep RPC access routed through `WalletContext`'s singletons. Do not create new `createSolanaRpc` instances per render.
- Keep program access routed through `services/heirloom.ts`. Do not import from `@historiah/heirloom` in components; wrap it in a typed helper first.
- Resolve token metadata once per screen with `useTokenMetadata` and pass the image down to `TokenAvatar`, so one DAS batch serves the whole view.
- `surface/` primitives (`Panel`, `Modal`, `OptionCard`, `PercentRow`, `tones`) are the shared design system. They are the same system the landing uses; a change to their look usually belongs in both packages.

## Troubleshooting

- **"Wallet not connected" thrown from an action**: `VaultContext.requireAuth` found no signer. Connect a wallet and retry.
- **"Prior estate/vault PDAs not yet cleared on-chain"** during re-create: a recent revoke is still propagating. The provider already waited 20 seconds; wait a few more and retry.
- **Tokens not showing in the estate card**: `discoverVaultTokenAccounts` filters out zero-balance accounts; confirm the deposit landed via the Explorer link.
- **Heartbeat from `/heartbeat` rejected**: confirm the connected wallet matches the estate's `hb_signer`. The page renders the registered signer under the lookup result for comparison.
- **Token metadata missing, icons falling back to mint addresses**: `VITE_SOLANA_RPC_ENDPOINT` is not a DAS-capable endpoint. Point it at Helius.
- **Yield or notifications UI missing**: both sit behind feature flags in `src/config/index.ts`. Neither is wired to a backend yet.
