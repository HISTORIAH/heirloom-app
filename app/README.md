# Heirloom, Web Application

**The only interface Alice ever sees. The one that turns a PDA into a promise.**

## Overview 

This package is the user-facing React application for Heirloom. It is a single-page app that lets anyone connect a Solana wallet, create an inheritance vault, keep it alive with periodic heartbeats (either from the authority key or from an optional hot signer wallet), pause the clock through a trusted delegate, and, when the time comes, claim the assets as the designated heir.

It is deliberately thin. It does not run business logic of its own, it does not cache on-chain state in any authoritative way, and it does not hide the contract from the user. Every meaningful action becomes a Solana transaction that the user signs with their own wallet. The app's job is to make that transaction easy to understand and impossible to get wrong.

## Tagline

> One wallet. One heir. One transaction away from done.

## Where This Fits

```
   ┌──────────────────────────────────────────────┐
   │                  app  (this package)         │
   │                                              │
   │   React components ─▶ lib/contracts.ts       │
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
```

The app never imports Solana program logic directly. It imports the **generated JS client** (`@historiah/heirloom`, a Yarn workspace package under `clients/js/`), which exposes typed instruction builders, account codecs, PDA derivers, and error decoders for every instruction the on-chain program supports. When the program changes, regenerating the client propagates the new shape into this package as a TypeScript type change at compile time.

## Technology Stack

- **React 18** with function components and hooks throughout.
- **TypeScript 5.6**, strict mode.
- **Vite 6** for dev server and production bundling.
- **React Router v6** for routing.
- **TanStack Query** for server-state caching of RPC reads.
- **Tailwind CSS 3** + **tailwindcss-animate** for styling, with Radix UI primitives (`Dialog`, `Toast`, `Tooltip`, `Slot`) wrapping accessible behavior.
- **lucide-react** for iconography and **sonner** for transient toasts.
- **`@solana/kit` v6** as the Solana SDK, tree-shakable, codec-based, and the native runtime of the generated client.
- **`@wallet-ui/react`** for wallet discovery, connection UX, and signer adapters.
- **`@solana-program/system`** and **`@solana-program/token`** for SPL Token and System Program instruction builders used alongside Heirloom instructions (creating ATAs, transferring checked amounts).
- **`gill`** for RPC convenience.
- **Helius DAS API** (optional) for SPL token metadata, symbols, and images on dashboard and claim screens.
- **`@historiah/heirloom`**, the generated Heirloom client, wired as `workspace:*`.

## Directory Layout

```
app/
├── index.html
├── vite.config.ts              Alias: "@" → "./src"
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json               References app + node configs
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
├── package.json
└── src/
    ├── main.tsx                ReactDOM root
    ├── App.tsx                 Providers + router + route table
    ├── index.css               Tailwind entry, global tokens
    ├── vite-env.d.ts
    │
    ├── pages/                  Route-level components
    │   ├── Index.tsx           Landing page (Hero, FAQ, CTA, etc.)
    │   ├── CreateVault.tsx     Estate creation form
    │   ├── Dashboard.tsx       Authority's estate list + actions
    │   ├── Claim.tsx           Heir flow with auto-discovery
    │   ├── Defer.tsx           Delegate pause flow
    │   ├── Heartbeat.tsx       Hot signer (hb_signer) heartbeat flow
    │   └── NotFound.tsx
    │
    ├── components/             Reusable view components
    │   ├── NavBar.tsx
    │   ├── NavLink.tsx
    │   ├── HeroSection.tsx
    │   ├── HowItWorksSection.tsx
    │   ├── VaultLifecycleSection.tsx
    │   ├── ComparisonSection.tsx
    │   ├── WhySolanaSection.tsx
    │   ├── FAQSection.tsx
    │   ├── CTASection.tsx
    │   ├── FooterSection.tsx
    │   ├── WalletConnectDialog.tsx
    │   ├── WalletPill.tsx      Connected-wallet pill: copy / change wallet
    │   ├── TokenAvatar.tsx     Token icon + symbol with Helius enrichment
    │   ├── ConfirmDialog.tsx   Destructive-action confirmation modal
    │   └── ui/                 Radix-based primitives
    │       ├── button.tsx
    │       ├── dialog.tsx
    │       ├── tooltip.tsx
    │       ├── toast.tsx
    │       ├── toaster.tsx
    │       └── sonner.tsx
    │
    ├── contexts/
    │   ├── WalletContext.tsx   RPC singletons + wallet-ui bridge
    │   └── VaultContext.tsx    Estate discovery, polling, on-chain actions
    │
    ├── hooks/
    │   ├── use-mobile.tsx
    │   ├── use-toast.ts
    │   ├── useTokenBalances.ts
    │   ├── useTokenMetadata.ts Helius DAS metadata fetcher with cache
    │   └── useWalletSplTokens.ts
    │
    ├── lib/
    │   ├── contracts.ts        The only module that talks to the client
    │   ├── heliusDas.ts        Typed Helius DAS API helpers
    │   └── utils.ts            clsx/tw-merge helper
    │
    ├── config/
    │   └── constants.ts        NETWORK, RPC_URL, PROGRAM_ID, mints,
    │                           Helius keys, explorer URLs
    │
    └── assets/                 Static imagery
```

## Routing

All routes are declared in `src/App.tsx`:

| Path            | Component         | Purpose                                                                |
| --------------- | ----------------- | ---------------------------------------------------------------------- |
| `/`             | `Index`           | Landing page. Hero, explainers, wallet connect CTA.                    |
| `/create-vault` | `CreateVault`     | Form to initialize a new estate and fund it with SOL and/or tokens.    |
| `/dashboard`    | `Dashboard`       | Authority view: list of estates, state badges, heartbeat, revoke.      |
| `/claim`        | `Claim`           | Heir view: auto-discover claimable estates and pull the assets.        |
| `/defer`        | `Defer`           | Delegate view: pause an authority's heartbeat clock.                   |
| `/heartbeat`    | `Heartbeat`       | Hot signer view: registered `hb_signer` refreshes the heartbeat.       |
| `*`             | `NotFound`        | 404.                                                                   |

## Provider Stack

`App.tsx` composes five providers, outer-to-inner:

1. `QueryClientProvider` (TanStack Query)
2. `TooltipProvider` (Radix)
3. `WalletUi` with a `createWalletUiConfig({ clusters })` list ordered by `VITE_NETWORK`
4. `WalletProvider`, local context that exposes RPC singletons and the current address
5. `VaultProvider`, owns estate discovery, polling, and on-chain write wrappers

Toast surfaces (`Toaster`, `Sonner`) mount inside the wallet/vault providers so any action can fire a notification.

## How the App Integrates with the Client and the Program

### The single gateway: `src/lib/contracts.ts`

This module is the only place where the app touches `@historiah/heirloom`. It does three things:

1. **Wraps every instruction builder** in an ergonomic `sendX(client, args)` function that composes the instruction(s), pipes them through `@solana/kit` transaction helpers, and returns a base58-encoded signature. The current set:
   - `sendInitialize` and `sendInitializeWithTokens` (initialize plus N register_asset deposits bundled into one tx).
   - `sendUpdate` (heartbeat refresh; signer can be the authority or the registered `hb_signer`).
   - `sendRevoke`, `sendRevokeAll` (multi-asset revoke ordered as tokens first then SOL).
   - `sendClaim`, `sendClaimAll` (same ordering, for the heir).
   - `sendDelegateDefer`.
   - `sendUpdateHeir` (re-derives PDAs for the new heir and migrates registered token accounts).
   - `sendRegisterAndDeposit` (add an SPL token to an existing estate).
   - `sendRegisterSolDeposit` (top up SOL on an existing estate via the mint-less `register_asset` path).
2. **Derives PDAs** via the generated `findEstatePda` and `findVaultPda`, plus `findAssociatedTokenPda` from `@solana-program/token`.
3. **Reads state from chain**:
   - `fetchEstateByPair` fetches one estate by (authority, heir) using `fetchMaybeEstate`.
   - `fetchEstatesByAuthority` and `fetchEstatesByHeir` use `getProgramAccounts` with `memcmp` filters on the Estate discriminator and the relevant offset (1 for authority, 33 for heir), then decode each account with the override-corrected `decodeEstate`. The heir variant powers auto-discovery on the claim page so an heir does not need to know the authority's address.
   - `fetchVaultClaimableLamports` returns the raw lamport balance minus the rent-exempt reserve, so the UI shows real deposits rather than rent overhead.
   - `discoverVaultTokenAccounts` calls `getTokenAccountsByOwner(vaultPda)` with `jsonParsed` encoding to enumerate SPL holdings, filtering out zero-balance accounts.

Bundling patterns the app relies on:

- **Initialize with multiple assets**: `sendInitializeWithTokens` bundles `initialize` plus one `register_asset` per extra token in a single signed transaction.
- **Revoke / claim all assets**: ordered tokens before SOL (since the SOL path closes the vault). The program closes the estate and vault PDAs inline once the last asset clears, returning rent.
- **Update heir**: re-derives `findEstatePda` and `findVaultPda` for the new heir (the generated client does not auto-derive dependent PDAs) and resolves the new vault ATA when a token is being migrated.

### The override pattern

`clients/js/src/main.ts` re-exports everything from `generated/`, then shadows a handful of identifiers with manual overrides from `overrides/`. Three codecs are currently patched:

- `getUpdateFieldsInstruction*` because Quasar's `OptionZc<i64>` wire format is nine fixed bytes, not the one-byte-tag-plus-nine form Codama infers.
- `decodeEstate` / `fetchEstate` / `getEstateCodec` because the `delegate: Option<Address>` and `hb_signer: Option<Address>` fields on `Estate` are also `OptionZc<Address>` (33 fixed bytes).
- `getInitializeInstruction*` because the `label` field is a Quasar `String<32>` with a u8 length prefix, not the u32 prefix Codama emits.

The overrides also export `findVaultPda`, `findEstatePda`, and the `TREASURY_ADDRESS` constant. The app imports from `@historiah/heirloom` and transparently gets the corrected codecs.

### State layer: `VaultContext`

`src/contexts/VaultContext.tsx` is where on-chain reality becomes UI reality. It:

- Polls `fetchEstatesByAuthority` every 15 seconds (or every 5 seconds while a create is pending) and assembles an `EstateData[]` with denormalized fields: parsed `delegate` and `hb_signer` options, computed SOL balance, discovered vault tokens, `claimable_assets` count, and human-readable lifecycle state.
- Computes lifecycle state off-chain with `computeState`, returning `active | grace | claimable | distributed` from `last_heartbeat + heartbeat_interval + grace_period` against `Date.now()`, treating drained or `is_claimed` estates as `distributed`.
- Exposes action callbacks (`createEstateOnChain`, `registerAssetOnChain`, `sendHeartbeatOnChain`, `revokeEstateOnChain`, `updateHeirOnChain`) that call into `lib/contracts.ts` and track the last pending signature.
- Handles the "stale PDA" edge case in `createEstateOnChain`: after a revoke, the runtime garbage-collects zero-lamport PDAs at transaction end, but RPC snapshots can lag. The provider polls `getAccountInfo` for up to 20 seconds before retrying `initialize`, surfacing a clear error if the accounts haven't cleared.

### Wallet layer: `WalletContext`

`src/contexts/WalletContext.tsx` creates one `createSolanaRpc(RPC_URL)` and one `createSolanaRpcSubscriptions(RPC_WS_URL)` at module scope; both are referentially stable singletons. It reads the connected account from `@wallet-ui/react`'s `useWalletUi()` and exposes `{ isConnected, publicKey, address, rpc, rpcSubscriptions, disconnectWallet }`. The signer itself is obtained inside `VaultContext` and the `Heartbeat` page via `useWalletUiSigner()`, which returns a `TransactionSigner` that forwards signing to the user's wallet extension.

### Token metadata: Helius DAS

`src/lib/heliusDas.ts` provides typed wrappers around the Helius `getAssetBatch` and `searchAssets` endpoints. `src/hooks/useTokenMetadata.ts` batches mint addresses, caches results in-memory, and resolves symbols, decimals, and image URIs (preferring `cdn_uri`). `TokenAvatar` renders the result with a graceful fallback when metadata is unavailable. The whole flow is gated on `VITE_HELIUS_API_KEY`; if no key is configured, the UI falls back to short mint addresses.

### Configuration: `src/config/constants.ts`

All environment-dependent values live here. Defaults target devnet, and when a Helius API key is present, RPC URLs default to Helius endpoints:

```ts
NETWORK         = import.meta.env.VITE_NETWORK         || "devnet"
HELIUS_API_KEY  = import.meta.env.VITE_HELIUS_API_KEY  || ""
RPC_URL         = import.meta.env.VITE_RPC_URL         || helius || cluster-default
RPC_WS_URL      = import.meta.env.VITE_RPC_WS_URL      || helius || cluster-default
PROGRAM_ID      = import.meta.env.VITE_PROGRAM_ID      || "JE2LF...AnKN"
USDC_MINT       = import.meta.env.VITE_USDC_MINT       || devnet USDC faucet mint
```

`explorerTxUrl(signature)` and `explorerAddressUrl(addr)` append the right `?cluster=` suffix based on `NETWORK`.

## Alice, Concretely

The base README introduces Alice, who wants her daughter Mia to inherit her SOL. Here is exactly what her fingers do in this app:

1. Opens `/`, sees the landing page (`Index` rendering `HeroSection`, `HowItWorksSection`, `VaultLifecycleSection`, `ComparisonSection`, `WhySolanaSection`, `FAQSection`, `CTASection`, `FooterSection`).
2. Clicks **Connect Wallet** in `NavBar`. `WalletConnectDialog` opens, powered by `@wallet-ui/react`. Once connected, `WalletPill` shows her address with copy and change-wallet affordances.
3. Navigates to `/create-vault`. The `CreateVault` page collects heir address, label, timer values, optional delegate, optional heartbeat signer (the field auto-hides when left at 0/empty), initial SOL amount, and optional token deposits. On submit, it calls `vault.createEstateOnChain(input)`, which routes through `sendInitializeWithTokens` to bundle `initialize` and every `register_asset` deposit into a single transaction.
4. On `/dashboard`, `VaultContext` renders her one estate card, showing `state: active`, the computed `secondsUntilGrace`, the vault SOL balance, and any SPL holdings discovered via `discoverVaultTokenAccounts` with `TokenAvatar`-rendered symbols and icons. Destructive actions (revoke, reassign heir) route through `ConfirmDialog`.
5. She clicks **Send Heartbeat**, which calls `sendHeartbeatOnChain(heir)`, which calls `sendUpdate` with all update fields `null`. The program reads null-everything as "just reset `last_heartbeat`".
6. From her phone wallet, she opens `/heartbeat`, enters her authority and Mia's heir address, and the page looks up the estate, verifies that her connected wallet matches the registered `hb_signer`, and lets her sign the same `update_fields` transaction without ever needing her cold key.
7. For her retreat, Bob opens `/defer`, enters Alice's authority + Mia's heir, and triggers `sendDelegateDefer`. The estate's `paused_until` advances.
8. If the worst happens, Mia (or her guardian) visits `/claim`. The page calls `fetchEstatesByHeir(rpc, heirAddress)` and auto-lists every estate where she is named heir. She picks one, signs once, `sendClaimAll` bundles all token claims followed by the SOL claim in a single transaction (tokens first because the SOL claim closes the vault), and the assets land in Mia's accounts minus the 0.75% protocol fee per asset.

Every step is one signed transaction. Every failure surfaces as a `sonner` toast with an Explorer link built from `explorerTxUrl`.

## Running the App

From the repo root (preferred, so Turborepo handles the client dependency):

```bash
yarn install
yarn dev:ui           # runs `turbo run dev --filter=app`
```

Or from within `app/`:

```bash
yarn dev              # Vite on http://localhost:5173
yarn build            # tsc -b && vite build → dist/
yarn preview          # Serve the production build locally
yarn lint             # ESLint (flat config)
```

### Environment Variables

Create `app/.env.local` (git-ignored) to override defaults:

```
VITE_NETWORK=devnet
VITE_RPC_URL=https://api.devnet.solana.com
VITE_RPC_WS_URL=wss://api.devnet.solana.com
VITE_PROGRAM_ID=JE2LFHb9zAwSM533gd79XJXyByZvVwoy8nYxhCsiAnKN
VITE_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
VITE_HELIUS_API_KEY=                  # optional, enables Helius RPC + DAS
VITE_HELIUS_RPC_URL=                  # optional, overrides default Helius URL
```

Vite exposes any `VITE_`-prefixed variable through `import.meta.env`. See `.env.example` at the package root for a copy-pasteable template.

### Regenerating the Client After a Program Change

If the on-chain program's IDL changes, run from the repo root:

```bash
yarn generate:clients
```

That rebuilds `clients/js/src/generated/`. Because `@historiah/heirloom` is a `workspace:*` dependency, the app picks up the change on the next Vite reload. Any broken type contracts show up in `tsc` before they show up in the browser.

## Conventions

- Path alias `@/` maps to `src/` (configured in `vite.config.ts` and mirrored in `tsconfig.app.json`).
- Components are PascalCase `.tsx`, hooks are kebab- or camel-cased `.ts`/`.tsx`, everything in `lib/` and `config/` is plain `.ts`.
- Styling is Tailwind-first. The `cn` helper in `lib/utils.ts` merges conditional class strings via `clsx` + `tailwind-merge`.
- Keep RPC access routed through `WalletContext`'s singletons. Do not create new `createSolanaRpc` instances per render.
- Keep program access routed through `lib/contracts.ts`. Do not import from `@historiah/heirloom` in components; wrap it in a typed helper first.
- Token displays should go through `TokenAvatar` + `useTokenMetadata` so the Helius cache is reused.

## Troubleshooting

- **"Wallet not connected" thrown from an action**: `VaultProviderDisconnected` is mounted; connect a wallet and the real provider takes over.
- **"Prior estate/vault PDAs not yet cleared on-chain"** during re-create: a recent revoke is still propagating. Wait a few seconds and retry.
- **Tokens not showing in the vault card**: `discoverVaultTokenAccounts` filters out zero-balance accounts; confirm the deposit actually landed via the Explorer link.
- **Heartbeat from `/heartbeat` rejected**: confirm the connected wallet's address matches the `hb_signer` field on the estate. The page renders the registered signer underneath the lookup result, so it is straightforward to compare.
- **`updateFields` / `initialize` encoding errors**: make sure you are importing from `@historiah/heirloom`, which re-exports the overrides. Importing directly from `@historiah/heirloom/generated` bypasses the codec fixes for `OptionZc<i64>`, `OptionZc<Address>`, and the u8 `label` length prefix.
- **Token metadata missing**: ensure `VITE_HELIUS_API_KEY` is set. Without it, `useTokenMetadata` short-circuits and `TokenAvatar` falls back to the truncated mint address.
