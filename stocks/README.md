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
| `/`          | Landing: the marketing page for Heirloom Stocks, with no wallet        |
| `/portfolio` | Portfolio: stock holdings, their coverage, what's vaulted              |
| `/browse`    | Every catalogued stock, grouped by company: live mainnet price, issuer powers, what the wallet holds on mainnet, and buying or selling through Jupiter |
| `/protect`   | Create a backup plan, choose what it covers                            |
| `/dashboard` | Check in, coverage health and re-approval, dividend calendar, issuer risk, plan settings |
| `/recover`   | Plans naming this wallet: recover, claim, defer, or check in for them  |
| `/inherit`   | Create a vault, add and withdraw stocks, vault settings                |

Every app route but `/browse` is wallet-gated. Only the landing is indexable:
the app routes carry `noindex`, and `public/robots.txt` keeps crawlers to `/`.

The whole origin, landing and app, speaks one visual language of its own, not
app.heirlm.xyz's panels or heirlm.xyz's mosaic: one column ruled into quarters,
soft rounded cards and list sheets, pill controls, a monospace voice (Geist
Mono) for labels and small print, and canvas pieces drawn in ASCII. Its classes
are the `hs-*` set in `src/styles/stocks.css`, which `index.css` imports ahead
of Tailwind's utilities so a utility on an element can still override one.
Paper ground, yellow for the main action and sage for "alive" are shared with
the rest of Heirloom. The landing's sections are in `src/components/landing/`;
every figure on it is live (catalog counts, Jupiter prices) or a program
constant from `@historiah/heirloom-stocks`.

## Running it

Against a local validator, with two test equities and funded wallets:

```bash
./programs/heirloom-stocks/build.sh   # once, from the repo root
cd stocks && bun run localnet
```

It prints a link per wallet (owner, recovery wallet, heir). Each carries its key
in `?burner=`, for the development burner wallet — open each in its own browser
profile and pick **Heirloom Burner** in Connect Wallet.

Against devnet, where the program is deployed:

```bash
cp stocks/.env.example stocks/.env    # then fill in the RPC endpoints
bun dev:stocks                        # http://localhost:5174
bun build:stocks
bun deploy:stocks                     # builds, then uploads with wrangler
```

## Devnet

`heirloom-stocks` is deployed to devnet at `8ZwqSnyXupsKsFqseEP62P9pw6hmvaBRu52PeYGo21mm`.
Its upgrade authority, and the program's `ADMIN` (the key allowed to register
issuers), is `Qa6QND9zTzYFfJfLVwsw8YGcYzySMi5Vg4wNASmLRJA`.

xStocks and Ondo mint only on mainnet, so devnet has test equities
configured like theirs (xStocks-like: permanent delegate, a scheduled
dividend) and (Ondo-like: none) — with their issuers registered.

Nothing about them is kept in the repo. The scripts find them on-chain,
through the token account each issuer holds for every equity it issues, and
print an explorer link for everything they send. They use the Solana CLI's RPC
URL and keypair unless `--rpc` / `--keypair` say otherwise:

```bash
bun run devnet:list --owner <address>                # every test equity, and what a wallet holds
bun run devnet:create --symbol TSTNV --name "Test NVIDIA xStock" --to <address>
                                                     # a new one; --issuer ondo for Ondo-like
bun run devnet:mint --to <address>                   # 25 of every test equity
bun run devnet:mint --to <address> --symbol TSTx --amount 100 --sol 0.5
bun run devnet:dividend --symbol TSTx --change 0.35 --days 7
bun run devnet:seed                                  # once; already done
```

Issuers for real mainnet mints are registered with
`clients/heirloom-stocks/js/scripts/register-issuers.ts`.

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
  it is fetched by `bun run catalog:refresh` and shipped with the app. Ondo's
  list has no names or logos, so the refresh reads them from each Ondo mint's
  own metadata on mainnet (`--rpc <url>` or `CATALOG_RPC_URL` to use another
  endpoint than the public one). It also marks which tokens Jupiter has a
  market for (about 550 of 1,368), which `/browse` lists first. The catalog
  labels mainnet stocks, lists those whose issuer isn't registered yet, and is
  what `/browse` shows; balances, coverage, and plans always come from the chain.
- `src/services/jupiter.ts` is everything mainnet that doesn't touch the stocks
  program: prices, a wallet's mainnet holdings, and swaps, all through
  Jupiter's API, whatever cluster the build reads. A swap is signed by the
  wallet for `solana:mainnet` and landed by Jupiter, so it needs no RPC of ours.
- `src/dev/burnerWallet.ts` is a wallet that signs with a local key. It loads
  only on the dev server with `VITE_DEV_BURNER_WALLET=true`, and is never part of
  a production build.
- `src/components/shell/` is the chrome every route shares (the app bar, the
  brand, the footer); `layout/StocksPage.tsx` is the ruled page frame and page
  head; `stocks/Section.tsx` holds the page primitives (sections, stat cards,
  list sheets, empty, loading and error states). `ui/button.tsx`, `ui/dialog.tsx`
  and `ui/toast.tsx` started as copies of `app/`'s but are restyled for this
  origin, so don't sync them back.
- Copy lives in the `stocks` namespace of `@heirloom/i18n`, registered through
  `@heirloom/i18n/stocks`. Generic chrome reuses the translated `app` namespace.
  Stocks copy is English-only so far; other languages fall back to it.

## Tests

The program has to be built first (`./programs/heirloom-stocks/build.sh`).

```bash
bun run test                        # services, and every builder against the program in litesvm
bun run test:localnet               # the services against a local validator
bun run test:e2e                    # the app in Chrome against a local validator
E2E_CLUSTER=devnet bun run test:e2e # the same flows against the devnet deployment
```

The devnet run funds its test wallets from the CLI keypair (0.1 SOL each) and
sweeps what is left back afterwards; a run costs about 0.01 SOL.

The localnet and end-to-end suites need the Solana CLI; the end-to-end suite
also needs Google Chrome (or `CHROME_PATH`). Its screenshots land in
`e2e/screenshots/<cluster>/`.
