# Heirloom Stocks

Backup and inheritance for tokenized equities, served at `stocks.heirlm.xyz`. It
is a Vite + React SPA on the same stack and design system as [`app/`](../app/README.md),
built on the `heirloom-stocks` program through the `@historiah/heirloom-stocks`
client in [`clients/heirloom-stocks/js`](../clients/heirloom-stocks/js). The user
docs are in [`docs/`](../docs/src/content/docs/stocks/).

- **Backup mode** keeps stocks in the owner's wallet, still tradeable, with the
  plan as their SPL delegate. If the owner stops checking in, the recovery
  wallet they named moves the covered holdings to itself.
- **Vault mode** holds deposited stocks in plan-owned accounts, which pass to an
  heir once the owner stops checking in.

## Routes

| Path         | Page                                                                   |
| ------------ | ---------------------------------------------------------------------- |
| `/`          | Portfolio: stock holdings, their coverage, what's vaulted              |
| `/protect`   | Create a backup plan, choose what it covers                            |
| `/dashboard` | Check in, coverage health and re-approval, dividend calendar, issuer risk, plan settings |
| `/recover`   | Plans naming this wallet: recover, claim, defer, or check in for them  |
| `/inherit`   | Create a vault, add and withdraw stocks, vault settings                |

Every route is wallet-gated, and the origin is `noindex`.

## Running it

Against a local validator, with two test equities and funded wallets:

```bash
./programs/heirloom-stocks/build.sh   # once, from the repo root
cd stocks && bun run localnet
```

It prints a link per wallet (owner, recovery wallet, heir). Each carries its key
in `?burner=`, for the development burner wallet — open each in its own browser
profile and pick **Heirloom Burner** in Connect Wallet.

Against a real cluster:

```bash
cp stocks/.env.example stocks/.env    # then fill in the RPC endpoints
bun dev:stocks                        # http://localhost:5174
bun build:stocks
bun deploy:stocks                     # builds, then uploads with wrangler
```

## Layout

- `src/lib/stocks/` builds every user-facing instruction. Each builder derives
  the accounts the generated client can't, and takes the mint's token program
  explicitly: read it with `fetchStockAsset`, because the generated defaults
  assume the original token program and every major equity issuer uses
  Token-2022.
- `src/services/` reads the chain. Whether a holding is a supported stock is
  decided on-chain by its issuer's registry entry; `coverage.ts` classifies each
  covered holding (covered, evicted, frozen, paused, …); `plans.ts` finds the
  plans that name a wallet with `getProgramAccounts`; `overview.ts` assembles
  what each page shows.
- `public/catalog.json` is the issuer catalog — names, logos, underlying
  tickers. The xStocks API can't be read from a browser (no CORS headers), so
  it is fetched by `bun run catalog:refresh` and shipped with the app.
- `src/dev/burnerWallet.ts` is a wallet that signs with a local key. It loads
  only on the dev server with `VITE_DEV_BURNER_WALLET=true`, and is never part of
  a production build.
- `src/components/` is partly copied from `app/` (header, wallet dialog,
  surfaces, primitives) until the planned `packages/ui` extraction.
- Copy lives in the `stocks` namespace of `@heirloom/i18n`, registered through
  `@heirloom/i18n/stocks`. Generic chrome reuses the translated `app` namespace.
  Stocks copy is English-only so far; other languages fall back to it.

## Tests

The program has to be built first (`./programs/heirloom-stocks/build.sh`).

```bash
bun run test            # services, and every builder against the program in litesvm
bun run test:localnet   # the services against a local validator
bun run test:e2e        # the app in Chrome against a local validator
```

The localnet and end-to-end suites need the Solana CLI; the end-to-end suite
also needs Google Chrome (or `CHROME_PATH`). Its screenshots land in
`e2e/screenshots/`.
