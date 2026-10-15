# Heirloom, Web Application

The React app at `app.heirlm.xyz`. You connect a Solana wallet, open an estate for
one heir, fund it with SOL and SPL tokens, and keep it alive with check-ins. When
the time comes, the heir claims. Every action is a transaction the user signs with
their own wallet. The app holds no authoritative state of its own.

> The marketing site lives in [`landing/`](../landing/README.md) and serves
> `heirlm.xyz`. Every route here is wallet-gated and `noindex`.

**Stack:** React 19, TypeScript, Vite, React Router, TanStack Query, Tailwind +
Radix, `@solana/kit`, `@wallet-ui/react`, and the generated client
`@historiah/heirloom` (`clients/heirloom/js`, `workspace:*`).

## Running

From the repo root:

```bash
bun install
bun dev:app           # Vite on http://localhost:5173
bun build:app
bun dev:landing       # optional: the landing alongside
```

Inside `app/`: `bun run dev`, `bun run build`, `bun run preview`, `bun run lint` (oxlint).

Copy `.env.example` to `.env.local` and fill it in. It documents every variable:

| Variable | Purpose |
|---|---|
| `VITE_SOLANA_RPC_ENDPOINT`, `VITE_SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT` | RPC; defaults to a local validator. Use Helius for DAS token metadata. |
| `VITE_LANDING_URL` | Where "Home" and a skipped tour go |
| `VITE_BACKEND_URL` | Backend API (auth, reminders, estate metadata) |
| `VITE_JUPITER_API_KEY` | USD prices; prices are skipped without it |
| `VITE_ANALYTICS_ENABLED`, `VITE_POSTHOG_*` | PostHog, off unless explicitly enabled |
| `VITE_FEATURE_YIELD_STAKING_UI` | Temporary flag; the yield flows are mocked, so they only show under `bun dev` (on unless `false`) and never in a build |

After a program IDL change, run `bun generate` from the root. Broken contracts
show up in `tsc`.

## Routes

Declared in `src/App.tsx`.

| Path | Page | Purpose |
|---|---|---|
| `/estates` | `Dashboard` | Owner's estates: check in, top up, edit, revoke |
| `/create-vault` | `CreateVault` | Four-step wizard: Heir → Deposit → Heartbeat → Review |
| `/inherit` | `Claim` | Heir: finds estates naming the wallet and claims them |
| `/guardian` | `Guardian` | Guardian: pauses a missed countdown once |
| `/check-in` | `CheckIn` | Check-in signer: checks in without the owner's cold key |
| `/verify-email` | `VerifyEmail` | Confirms a reminder email address |

`/` and `/dashboard` redirect to `/estates`. The old `/claim`, `/defer` and
`/heartbeat` paths redirect to their new names.

## Architecture

- **`services/heirloom.ts`** is the only module that imports `@historiah/heirloom`.
  It holds the reads (`fetchEstatesBy*`, snapshots), the writes (one per program
  action) and `computeEstateState`. `lib/heirloom/` underneath it derives PDAs,
  builds instructions and sends transactions. `*All` variants send tokens before
  SOL, because the SOL path closes the vault.
- **`contexts/WalletContext.tsx`** owns the RPC singletons. **`WithWallet`**
  supplies the signer only once an account is connected, so pages stay viewable
  while disconnected.
- **`contexts/VaultContext.tsx`** polls the owner's estates and exposes the
  on-chain actions. It also waits out stale PDAs when an estate is re-created
  after a revoke.
- **`services/api/`** calls the backend for wallet auth, reminders and estate
  metadata. **`services/das.ts`** and **`services/prices.ts`** handle token
  metadata (Helius DAS) and prices (Jupiter).
- Env vars are read only in `src/config/`. Fixed values live in `src/lib/constants.ts`.

## Crossing the Origin Boundary

The landing and the app are separate origins. Nothing is shared between them
implicitly, so three things are carried across on purpose:

| What | Direction | Carried by |
|---|---|---|
| Language | landing → app | `?lang=<code>`, read once by `getInitialLocale()` in `@heirloom/i18n`, saved to `localStorage`, then stripped from the URL |
| Language | app → landing | `landingUrl(locale)` in `src/config`, which appends the locale's path prefix (`/ja/`) |
| Product tour | landing → app | `?tour=1`, read once by `AppTour` on mount |
| Analytics identity | both ways | PostHog cookie on `.heirlm.xyz`. Both sides must use the same ingestion host. |

## Conventions

- `@/` maps to `src/`. Shared types go in `src/types/`. Tests go in `tests/`. See the repo's `AGENTS.md`.
- All copy goes through `useTranslation("app")`. Add strings to `packages/i18n/src/locales/app/en.ts` first.
- Don't import `@historiah/heirloom` in components, and don't create RPC clients per render.
- Resolve token metadata once per screen with `useTokenMetadata` and pass images down to `TokenAvatar`.
- `components/surface/` is the design system shared with the landing. A visual change there usually belongs in both packages.
- Analytics never sends addresses, signatures, amounts, form values or error text. Events are a closed union in `src/types/index.ts`.

## Troubleshooting

- **"Wallet not connected" from an action**: no signer. Connect a wallet and retry.
- **"Prior estate/vault PDAs not yet cleared on-chain"**: a recent revoke is still propagating. Wait a few seconds and retry.
- **Check-in rejected on `/check-in`**: the connected wallet isn't the estate's check-in signer.
- **Icons fall back to mint addresses**: the RPC endpoint doesn't support DAS. Point it at Helius.
- **No USD values**: `VITE_JUPITER_API_KEY` is unset.
