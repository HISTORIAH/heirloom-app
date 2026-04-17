# Heirloom — Web Application

**The only interface Alice ever sees. The one that turns a PDA into a promise.**

## Overview

This package is the user-facing React application for Heirloom. It is a single-page app that lets anyone connect a Solana wallet, create an inheritance vault, keep it alive with periodic heartbeats, pause the clock through a trusted delegate, and — when the time comes — claim the assets as the designated heir.

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
- **`@solana/kit` v6** as the Solana SDK — tree-shakable, codec-based, and the native runtime of the generated client.
- **`@wallet-ui/react`** for wallet discovery, connection UX, and signer adapters.
- **`@solana-program/system`** and **`@solana-program/token`** for SPL Token and System Program instruction builders used alongside Heirloom instructions (creating ATAs, funding token accounts, transferring checked amounts).
- **`gill`** for RPC convenience.
- **`@historiah/heirloom`** — the generated Heirloom client, wired as `workspace:*`.

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
    │   ├── Claim.tsx           Heir flow
    │   ├── Defer.tsx           Delegate pause flow
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
    │   └── useWalletSplTokens.ts
    │
    ├── lib/
    │   ├── contracts.ts        The only module that talks to the client
    │   └── utils.ts            clsx/tw-merge helper
    │
    ├── config/
    │   └── constants.ts        NETWORK, RPC_URL, PROGRAM_ID, mints, explorer URLs
    │
    └── assets/                 Static imagery
```

## Routing

All routes are declared in `src/App.tsx`:

| Path            | Component         | Purpose                                                              |
| --------------- | ----------------- | -------------------------------------------------------------------- |
| `/`             | `Index`           | Landing page. Hero, explainers, wallet connect CTA.                  |
| `/create-vault` | `CreateVault`     | Form to initialize a new estate and fund it with SOL and/or tokens.  |
| `/dashboard`    | `Dashboard`       | Authority view: list of estates, state badges, heartbeat, revoke.    |
| `/claim`        | `Claim`           | Heir view: locate a claimable estate and pull the assets.            |
| `/defer`        | `Defer`           | Delegate view: pause an authority's heartbeat clock.                 |
| `*`             | `NotFound`        | 404.                                                                 |

## Provider Stack

`App.tsx` composes five providers, outer-to-inner:

1. `QueryClientProvider` (TanStack Query)
2. `TooltipProvider` (Radix)
3. `WalletUi` with a `createWalletUiConfig({ clusters })` list ordered by `VITE_NETWORK`
4. `WalletProvider` — local context that exposes RPC singletons and the current address
5. `VaultProvider` — owns estate discovery, polling, and on-chain write wrappers

Toast surfaces (`Toaster`, `Sonner`) mount inside the wallet/vault providers so any action can fire a notification.

## How the App Integrates with the Client and the Program

### The single gateway: `src/lib/contracts.ts`

This module is the only place where the app touches `@historiah/heirloom`. It does three things:

1. **Wraps every instruction builder** (`getInitializeInstructionAsync`, `getClaimInstructionAsync`, `getRegisterAssetInstructionAsync`, `getRevokeInstructionAsync`, `getDelegateDeferInstructionAsync`, `getUpdateFieldsInstructionAsync`, `getUpdateHeirInstructionAsync`, `getCloseEstateInstructionAsync`) in an ergonomic `sendX(client, args)` function that composes the instruction(s), pipes them through `@solana/kit` transaction helpers, and returns a base58-encoded signature.
2. **Derives PDAs** via the generated `findEstatePda` and `findVaultPda`, plus `findAssociatedTokenPda` from `@solana-program/token`.
3. **Reads state from chain**:
   - `fetchEstateByPair` — fetch one estate by (authority, heir) using `fetchMaybeEstate`.
   - `fetchEstatesByAuthority` — `getProgramAccounts` with `memcmp` filters on the Estate discriminator and authority offset, then manually `decodeEstate` each account. This avoids needing an indexer.
   - `fetchVaultClaimableLamports` — raw lamport balance minus rent-exempt reserve, so the UI shows real deposits rather than the rent overhead.
   - `discoverVaultTokenAccounts` — `getTokenAccountsByOwner(vaultPda)` with `jsonParsed` encoding to enumerate SPL holdings.

Some flows bundle multiple instructions into a single transaction:

- **Register asset + deposit** — `system_program.create_account` for the vault token account, `heirloom.register_asset` to init it on-chain, `spl_token.transfer_checked` to move tokens in.
- **Revoke with tokens** — `create_associated_token_idempotent` for the authority ATA (so revoked tokens have a destination), then `heirloom.revoke`.
- **Claim with tokens** — `create_associated_token_idempotent` for the heir ATA, then `heirloom.claim`.
- **Update heir** — manually re-derive `findEstatePda` and `findVaultPda` for the new heir (the generated client does not auto-derive dependent PDAs) and pass them into `getUpdateHeirInstructionAsync`.

### The override pattern

`clients/js/src/main.ts` re-exports everything from `generated/`, then shadows a handful of identifiers with manual overrides from `overrides/`. Currently `getUpdateFieldsInstruction*` is overridden because Quasar's `OptionZc<i64>` wire format is nine fixed bytes, not the one-byte-tag-plus-nine form Codama infers. The app imports from `@historiah/heirloom` and transparently gets the corrected codec.

### State layer: `VaultContext`

`src/contexts/VaultContext.tsx` is where on-chain reality becomes UI reality. It:

- Polls `fetchEstatesByAuthority` every 15 seconds (or every 5 seconds while a create is pending) and assembles a `EstateData[]` with denormalized fields: parsed delegate `Option`, computed SOL balance, discovered vault tokens, human-readable lifecycle state.
- Computes lifecycle state off-chain with `computeState` — `active | grace | claimable | distributed` — using `last_heartbeat + heartbeat_interval + grace_period` against `Date.now()` and treating drained or `is_claimed` estates as `distributed`.
- Exposes action callbacks (`createEstateOnChain`, `registerAssetOnChain`, `sendHeartbeatOnChain`, `revokeEstateOnChain`, `updateHeirOnChain`) that call into `lib/contracts.ts` and track the last pending signature.
- Handles the "stale PDA" edge case in `createEstateOnChain` — after a revoke, the runtime garbage-collects zero-lamport PDAs at transaction end, but RPC snapshots can lag. The provider polls `getAccountInfo` for up to 20 seconds before retrying `initialize`, surfacing a clear error if the accounts haven't cleared.

### Wallet layer: `WalletContext`

`src/contexts/WalletContext.tsx` creates one `createSolanaRpc(RPC_URL)` and one `createSolanaRpcSubscriptions(RPC_WS_URL)` at module scope — both are referentially stable singletons. It reads the connected account from `@wallet-ui/react`'s `useWalletUi()` and exposes `{ isConnected, publicKey, address, rpc, rpcSubscriptions, disconnectWallet }`. The signer itself is obtained inside `VaultContext` via `useWalletUiSigner()`, which returns a `TransactionSigner` that forwards signing to the user's wallet extension.

### Configuration: `src/config/constants.ts`

All environment-dependent values live here. Defaults target devnet:

```ts
NETWORK        = import.meta.env.VITE_NETWORK       || "devnet"
RPC_URL        = import.meta.env.VITE_RPC_URL       || cluster-default
RPC_WS_URL     = import.meta.env.VITE_RPC_WS_URL    || cluster-default
PROGRAM_ID     = import.meta.env.VITE_PROGRAM_ID    || "JE2LF...AnKN"
USDC_MINT      = import.meta.env.VITE_USDC_MINT     || devnet USDC faucet mint
```

`explorerTxUrl(signature)` and `explorerAddressUrl(addr)` append the right `?cluster=` suffix based on `NETWORK`.

## Alice, Concretely

The base README introduces Alice, who wants her daughter Mia to inherit her SOL. Here is exactly what her fingers do in this app:

1. Opens `/` → sees the landing page (`Index` → `HeroSection`, `HowItWorksSection`, `VaultLifecycleSection`, `ComparisonSection`, `WhySolanaSection`, `FAQSection`, `CTASection`, `FooterSection`).
2. Clicks **Connect Wallet** in `NavBar` → `WalletConnectDialog` opens, powered by `@wallet-ui/react`.
3. Navigates to `/create-vault`. The `CreateVault` page collects heir address, label, timer values, delegate, initial SOL amount, and optional token deposits. On submit, it calls `vault.createEstateOnChain(input)` which fans out to `sendInitialize` and, for each token, `sendRegisterAndDeposit`.
4. On `/dashboard`, `VaultContext` renders her one estate card, showing `state: active`, the computed `secondsUntilGrace`, the vault SOL balance, and any SPL holdings discovered via `discoverVaultTokenAccounts`.
5. She clicks **Send Heartbeat** → `sendHeartbeatOnChain(heir)` → `sendUpdate` with all update fields `null` (the program reads null-everything as "just reset `last_heartbeat`").
6. For her retreat, Bob opens `/defer`, enters Alice's authority + Mia's heir, and triggers `sendDelegateDefer`. The estate's `paused_until` advances.
7. If the worst happens, Mia (or her guardian) visits `/claim`, the heir wallet signs once, `sendClaim` bundles an idempotent ATA create plus the `claim` instruction, and the vault empties into Mia's accounts.

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
```

Vite exposes any `VITE_`-prefixed variable through `import.meta.env`.

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

## Troubleshooting

- **"Wallet not connected" thrown from an action** — `VaultProviderDisconnected` is mounted; connect a wallet and the real provider takes over.
- **"Prior estate/vault PDAs not yet cleared on-chain"** during re-create — a recent revoke is still propagating. Wait a few seconds and retry.
- **Tokens not showing in the vault card** — `discoverVaultTokenAccounts` filters out zero-balance accounts; confirm the deposit actually landed via the Explorer link.
- **`updateFields` encoding errors** — make sure you are importing from `@historiah/heirloom`, which re-exports the override. Importing directly from `@historiah/heirloom/generated` bypasses the fix.
