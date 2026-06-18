# Heirloom

**Don't let your crypto die with you**

## Overview

Heirloom is a Solana-native inheritance protocol. It lets any wallet holder lock digital assets into a programmatic estate that transfers to a designated heir if the owner goes silent for too long. No lawyers. No custodians. No probate court. Just a heartbeat, a grace period, and a public key.

The owner (the "authority") configures two clocks when creating an estate: a heartbeat interval and a grace period. As long as the authority pings the program before the heartbeat expires, the estate stays locked to them and nobody else can touch it. If the heartbeat lapses and the grace period runs out, the heir, and only the heir, can claim the full vault on-chain. The authority can also name an optional delegate who is allowed to pause the clock on their behalf (useful for planned absences like travel, surgery, or detainment), and an optional hot heartbeat signer that may refresh the timer without holding full authority over the estate.

Heirloom replaces the opaque, jurisdictional, and often adversarial machinery of traditional estate transfer with a transparent, deterministic smart contract that runs on the Solana runtime.

## Tagline

> Your keys outlive you. Your wealth should too.

## Core Concepts

- **Estate**: a PDA account that encodes the owner, heir, schedule, status, optional delegate, optional heartbeat signer, and asset count for a single inheritance arrangement.
- **Vault**: a sibling PDA that custodies the deposited SOL and token accounts. Funds live here, not in the estate record. The vault account stores a back-pointer to its estate plus its bump.
- **Heartbeat**: a no-op transaction that resets the inactivity clock. Think of it as a pulse. The authority can sign one, and so can an optional `hb_signer` hot wallet if one was configured.
- **Grace period**: an extra buffer after a missed heartbeat, during which the owner can still recover.
- **Pause / defer**: a time-boxed freeze on the heartbeat countdown, invokable by an optional delegate, for when the owner is knowingly unreachable.
- **Claim**: the irreversible transfer of all vault assets to the heir once the estate reaches the `claimable` state. A small protocol fee is routed to the treasury; the remainder lands in the heir's wallet.
- **Revoke**: owner-initiated dismantling of an estate before the heir claims, returning the assets to the authority minus the emergency-exit protocol fee.
- **Hot signer (`hb_signer`)**: an optional secondary wallet whose only power is to call `update_field` and refresh the heartbeat. Useful for routine pings from a low-value device without exposing the authority key.
- **Treasury**: a protocol-owned address that collects the claim and emergency-exit fees. The current treasury is `tr31o8FF9v2rEukh84ZwjRQgYa3x74PHssighePMP1Q`.

## Protocol Fees

| Path                | Rate            | Constant                  |
| ------------------- | --------------- | ------------------------- |
| Heir claim          | 0.75% (75 bps)  | `CLAIM_FEE_BPS`           |
| Authority revoke    | 0.5% (50 bps)   | `EMERGENCY_EXIT_FEE_BPS`  |

Fees are computed per asset on the gross balance at the moment of transfer. SOL fees move lamports directly to the treasury; SPL fees use a checked transfer into the treasury's ATA, which the program creates idempotently if it does not yet exist.

## End-to-End User Flow

Meet **Alice**. She is a long-term SOL holder and a mother of one. She wants her six-year-old daughter **Mia** to inherit her on-chain savings if anything happens to her, without handing over her seed phrase or trusting a centralized custodian. Alice also has a best friend, **Bob**, a lawyer she trusts to manage her affairs if she is ever incapacitated, and a low-value phone wallet she carries day-to-day called **Pulse**.

### 1. Alice creates the vault

Alice opens the Heirloom web app, clicks **Connect Wallet**, and signs in with her Solflare wallet. She lands on `/create-vault` and fills in the form:

- **Heir**: Mia's wallet address.
- **Label**: `Mia trust`.
- **Heartbeat interval**: 90 days.
- **Grace period**: 30 days.
- **Pause duration**: 60 days.
- **Delegate**: Bob's wallet address.
- **Heartbeat signer**: Pulse's wallet address (so day-to-day pings do not require her cold key).
- **Initial deposit**: 500 SOL plus 10,000 USDC.

She clicks **Create Estate**. The app bundles `initialize` and a `register_asset` deposit for the USDC into a single Solana transaction. Alice approves in her wallet. Seconds later, the dashboard shows one active estate card labeled **Mia trust**, state `active`, next heartbeat due in 90 days.

### 2. Alice stays alive

Every few weeks Alice opens the dashboard and clicks **Send Heartbeat**, or she pulls out her Pulse phone wallet, visits `/heartbeat`, looks up the estate by authority and heir, and signs a single transaction from there. Either path lands the same `update_field` instruction on-chain with no field changes; the program treats it as a pulse and resets `last_heartbeat`. The estate stays in state `active`. Mia cannot claim.

### 3. Alice goes on sabbatical

Alice plans a three-month silent meditation retreat where she will have no device access. Before leaving, she messages Bob. Bob opens Heirloom, connects his own wallet, navigates to `/defer`, enters Alice's authority address and Mia's heir address, and signs the `delegate_defer` instruction. The estate's `paused_until` field jumps forward by Alice's configured pause duration. Even if Alice does not ping for two months, the clock does not advance.

### 4. Alice comes back, or doesn't

**Case A, she returns.** Alice sends a fresh heartbeat. State returns to `active`. Nothing changes.

**Case B, she doesn't.** The pause expires. The heartbeat interval elapses. State transitions to `grace`. Thirty more days pass with no pulse. State transitions to `claimable`. Mia (or her guardian acting with Mia's key) opens `/claim`, connects the heir wallet, and the app automatically discovers any estates that name her as heir via `getProgramAccounts`. She signs a single bundled transaction. The vault drains: protocol fees go to the treasury, 500 SOL minus 0.75% and 10,000 USDC minus 0.75% land in Mia's associated token accounts. Once the last asset clears the vault, the program closes the estate and vault PDAs inline and the rent is reclaimed.

### 5. Alice changes her mind

At any time before the claim, Alice can:

- **Update heir**: rotate Mia's address to a new key after she comes of age. The program re-derives the estate and vault PDAs for the new heir and migrates any registered token accounts.
- **Revoke**: dismantle the estate and pull all assets back to her own wallet, minus the 0.5% emergency-exit fee per asset.
- **Update fields**: change the heartbeat cadence, grace window, pause duration, or label.

None of these are available to anyone but the authority. The contract enforces it.

## Architecture

```
+----------------------+         +--------------------------+
|  React + Vite SPA    | ──────▶ |  @historiah/heirloom     |
|  (app/)              |         |  (clients/heirloom/js)   |
+----------+-----------+         +-------------+------------+
           │                                   │
           │  wallet signing                   │  instruction + account codecs
           ▼                                   ▼
     +------------+                   +-----------------------+
     | @solana/kit|  RPC / tx ──────▶ |  Heirloom Program     |
     |  + gill    |                   |  (Anchor, on-chain)   |
     +------------+                   +-----------------------+
                                                │
                                                ▼
                                      +-------------------+
                                      |  Estate + Vault   |
                                      |       PDAs        |
                                      |   Treasury fees   |
                                      +-------------------+
```

Three layers, one contract:

1. **On-chain program**: a Solana smart contract written in Rust using the [Anchor](https://www.anchor-lang.com/) framework (with `anchor-spl` for SPL Token CPIs). Owns the Estate and Vault account schemas, enforces every state transition, holds custody of deposited assets, computes and routes protocol fees, and closes accounts inline once they are drained. The program also embeds a `security_txt` contact block.
2. **Generated clients**: strongly-typed instruction builders, account decoders, PDA derivers, and error types. Generated by [Codama](https://github.com/codama-idl/codama) directly from the Anchor IDL (`target/idl/heirloom.json`) into both JavaScript (consumed by the app and the test suite) and Rust (for off-chain tooling). Because the IDL is emitted by Anchor, the generated codecs are used as-is — no hand-written overrides are required.
3. **React SPA**: the only user-facing surface. Handles wallet connection, estate discovery, human-readable state rendering, and transaction construction. Never speaks to the program directly; always through the generated client.

### Why this split matters

The generated client is the load-bearing boundary. When the on-chain program changes an instruction signature, rebuilding the program emits a new IDL and regenerating the clients propagates the type change into the app at compile time. A breaking program update that the app forgets to handle will fail `tsc`, not production.

## Repository Layout

```
heirloom-app/
├── programs/
│   ├── heirloom/             Anchor program (Rust)
│   │   ├── src/
│   │   │   ├── lib.rs        #[program] entrypoint, declare_id!, security_txt
│   │   │   ├── state.rs      Estate + Vault account definitions
│   │   │   ├── constants.rs  Fee bps + treasury address
│   │   │   ├── error.rs      Typed program errors
│   │   │   ├── helpers.rs    Fee math, distribution helpers, account close
│   │   │   └── instructions/ One file per handler: initialize, claim,
│   │   │                     revoke, defer, update_field, update_heir,
│   │   │                     register_asset (+ deploy_yield / recall_yield,
│   │   │                     scaffolded — see Roadmap)
│   │   └── Cargo.toml
│   └── heirloom-ika/         Cross-chain IKA program (see app-ika/README.md)
│
├── clients/                  Codama-generated clients
│   ├── heirloom/
│   │   ├── js/               @historiah/heirloom — consumed by app/ and tests/
│   │   │   └── src/
│   │   │       ├── generated/    Codama output (do not edit by hand)
│   │   │       ├── constants.ts  Treasury address
│   │   │       └── main.ts       Public entry point
│   │   └── rust/             heirloom-program Rust client
│   └── heirloom-ika/         IKA clients (js + rust)
│
├── app/                      Solana-native SPA (React + Vite)
│   ├── src/
│   │   ├── pages/            Index, CreateVault, Dashboard, Claim,
│   │   │                     Defer, Heartbeat, NotFound
│   │   ├── components/       Landing sections (Hero with live vault
│   │   │   │                 demo + HeartbeatLine, HowItWorks,
│   │   │   │                 VaultLifecycle, WhySolana, Comparison, FAQ,
│   │   │   │                 CTA, Footer, NavBar) + reusable UI
│   │   │   │                 (TokenAvatar, WalletPill, ConfirmDialog,
│   │   │   │                 WalletConnectDialog, WithWallet, ErrorBoundary)
│   │   │   ├── create-vault/ Wizard steps: Heir, Heartbeat, Deposit, Review
│   │   │   ├── dashboard/    AddAsset, EditSettings, EmergencyWithdraw,
│   │   │   │                 ReassignHeir sections
│   │   │   ├── tour/         Guided onboarding tour (react-joyride)
│   │   │   └── ui/           Radix-based primitives
│   │   ├── contexts/         WalletContext, VaultContext, TourContext,
│   │   │                     AnalyticsContext
│   │   ├── hooks/            useTokenBalances, useTokenMetadata,
│   │   │                     useWalletSplTokens, use-mobile, use-toast
│   │   ├── lib/
│   │   │   ├── heirloom/     Gateway to the generated client (client,
│   │   │   │                 instructions, pdas, accounts, tokens)
│   │   │   ├── ix.ts, anchor.ts, amountInput.ts  Tx + input helpers
│   │   │   ├── estateLookup.ts, estateState.ts  Discovery + state math
│   │   │   ├── heliusDas.ts  Helius DAS API client for token enrichment
│   │   │   ├── analytics.ts  PostHog product analytics wrapper
│   │   │   └── utils.ts
│   │   └── config/index.ts   RPC + analytics configuration
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── app-ika/                  Cross-chain IKA frontend (see app-ika/README.md)
│
├── waitlist/                 Marketing + waitlist landing site (deployed
│                             to Cloudflare Pages via Wrangler)
│
├── packages/                 Shared workspace packages
│
├── tests/                    Integration suite (Bun + @solana/kit)
│   ├── initialize.test.ts
│   ├── claim.test.ts
│   ├── revoke.test.ts
│   ├── registerAssets.test.ts
│   ├── updateFields.test.ts
│   ├── updateHeir.test.ts
│   ├── updateHeirAndClaim.test.ts
│   └── setup.ts
│
├── Anchor.toml               Anchor workspace (programs, cluster, scripts)
├── heirloom.codama.json      Codama config for the heirloom program
├── heirloom-ika.codama.json  Codama config for the IKA program
├── turbo.json                Turborepo pipeline
├── package.json              Monorepo root (Bun workspaces)
└── README.md                 You are here
```

## Cross-chain (IKA) variant

See [app-ika/README.md](./app-ika/README.md).

## Tools and Technologies

**On-chain**

- Rust (edition 2021)
- [Anchor](https://www.anchor-lang.com/) `1.0.x`, the standard Solana program framework
- `anchor-spl` for SPL Token CPIs, ATA creation, and mint introspection
- `solana-security-txt` for an on-chain security contact block
- `beethoven` (yield integration — scaffolded, see Roadmap)

**Client generation**

- [Codama](https://github.com/codama-idl/codama), an IDL-driven multi-language client generator
- `@codama/renderers-js` and `@codama/renderers-rust`, target-specific renderers
- `@codama/nodes-from-anchor`, bridges the Anchor IDL into Codama's AST

**Frontend**

- React 18 + TypeScript 5.8
- Vite 6 (dev server + bundler)
- Tailwind CSS 3 + `tailwindcss-animate`
- Radix UI primitives (Dialog, Toast, Tooltip, Slot)
- `lucide-react` iconography
- `react-router-dom` v6
- `@tanstack/react-query` for async state
- `sonner` for transient toasts
- `react-joyride` for the guided onboarding tour
- `posthog-js` + `@posthog/react` for opt-in product analytics

**Solana integration**

- `@solana/kit`, modern tree-shakable Solana client SDK (v6)
- `@wallet-ui/react`, wallet connection modal and signer adapter
- `@solana-program/system`, `@solana-program/token`, `@solana-program/token-2022`, SPL Token + System Program instruction builders
- `gill`, RPC helpers
- Helius DAS API for token metadata and image enrichment (via `lib/heliusDas.ts`)

**Tooling and infrastructure**

- Bun (root package manager and test runner for the TypeScript integration suite)
- Anchor CLI (program build, IDL emission, deploy, localnet)
- Turborepo (monorepo task pipeline)
- Wrangler (Cloudflare Pages deploy for the waitlist site)

## On-Chain Instructions

| Instruction      | Signer                   | Purpose                                                                 |
| ---------------- | ------------------------ | ----------------------------------------------------------------------- |
| `initialize`     | authority                | Create an estate + vault, deposit initial SOL or token, configure timers, optional delegate, optional `hb_signer` |
| `claim`          | heir                     | Drain a single vault asset to the heir once the estate is claimable, take protocol fee, close PDAs when the last asset clears |
| `update_field`   | authority or `hb_signer` | Reset heartbeat and optionally change interval, grace, pause duration, or label |
| `revoke`         | authority                | Dismantle an estate one asset at a time, take emergency-exit fee, close PDAs when the last asset clears |
| `delegate_defer` | delegate                 | Freeze the heartbeat clock for the configured pause duration            |
| `update_heir`    | authority                | Migrate the estate to a different heir address                          |
| `register_asset` | authority                | Add a new SPL token asset (or top up SOL) on an existing estate         |

Instructions use Anchor's 8-byte hash discriminators. Accounts: `Estate` (PDA seeds `[b"estate", authority, heir]`) and `Vault` (PDA seeds `[b"vault", authority, heir]`), both with Anchor account discriminators.

The `Estate` record stores `authority`, `heir`, `heartbeat_interval`, `grace_period`, `last_heartbeat`, `created_at`, `bump`, `is_claimed`, `pause_duration`, `paused_until`, `is_deferred`, `delegate: Option<Pubkey>`, `hb_signer: Option<Pubkey>`, `claimable_assets: u8` (the number of vault token accounts still open under the estate, plus one if the SOL balance is still claimable), and `label: String`. The `Vault` record stores its parent `estate` pubkey and `bump`.

`claim` and `revoke` are designed to be bundled per asset in a single transaction by the client. The app provides `sendClaimAll` and `sendRevokeAll` wrappers that order tokens before SOL (since draining SOL closes the vault) and dispatch all instructions in one signed transaction.

## Getting Started

### Prerequisites

- Node.js 18+
- Bun 1.3+ (root package manager, client generation, and tests)
- Rust stable + the Solana toolchain + Anchor CLI (for building the program)
- A funded devnet wallet (use `solana airdrop [int]`) or a local validator

### Install

```bash
bun install
```

### Build the program and regenerate clients

```bash
# Build the Anchor program (emits target/idl/heirloom.json):
anchor build

# Then regenerate the typed clients from the IDL:
bun generate            # both programs
bun generate:heirloom   # heirloom only
```

`bun generate` invokes Codama against `heirloom.codama.json` / `heirloom-ika.codama.json`, emitting the JS and Rust client crates into `clients/`. Consumers always import from `@historiah/heirloom`.

### Run the frontend

```bash
bun dev:ui        # heirloom app
bun dev:ika       # IKA app
bun dev:waitlist  # marketing + waitlist site
```

Vite serves the app on `http://localhost:5173`. By default the app talks to a local validator; override the RPC endpoints with environment variables:

```bash
VITE_SOLANA_RPC_ENDPOINT=http://127.0.0.1:8899
VITE_SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT=ws://127.0.0.1:8900
```

Point these at a devnet (or Helius) RPC to run against devnet. The program ID and treasury address are baked into the generated client, not the app's environment.

Product analytics are opt-in and disabled by default. To enable PostHog, set:

```bash
VITE_ANALYTICS_ENABLED=true
VITE_POSTHOG_PROJECT_TOKEN=<your-project-token>
```

### Run the tests

The integration suite is a Bun + `@solana/kit` harness that exercises every instruction (initialize, multi-asset register, revoke, claim, heir reassignment, and claim-after-heir-rotation) through the generated JS client. It runs against a local validator:

```bash
# In one terminal, start a validator with the program deployed:
anchor localnet           # or: solana-test-validator

# In another terminal:
bun test
```

### Build and deploy

```bash
bun build:ui        # build the heirloom app
bun build:ika       # build the IKA app
bun build:waitlist  # build the waitlist site

anchor deploy       # deploy the program to the configured cluster
```

The default Anchor cluster is `localnet` (see `Anchor.toml`); switch the `[provider] cluster` or pass `--provider.cluster devnet` to deploy elsewhere.

## Networks

| Network      | Program ID                                     | Status     |
| ------------ | ---------------------------------------------- | ---------- |
| localnet     | `FQiUcHRKJxSuShaRJszEPoRBinubDPoPPD75NvGtPRya` | Default    |
| devnet       | `FQiUcHRKJxSuShaRJszEPoRBinubDPoPPD75NvGtPRya` | Target     |
| mainnet-beta | -                                              | Pending    |

The IKA program ID is `9ede3aHXJiv14BNT67MWpgFGugtP1PSdBuLDuRX2D4sf`.

## Roadmap

- **Yield on idle balances**: `deploy_yield` / `recall_yield` instruction handlers and a `beethoven` deposit integration are scaffolded in the program but are not yet wired into the `#[program]` entrypoint, so they are not callable on-chain. The goal is to let an estate route its dormant SOL into a yield position and recall it on claim or revoke.

## Security Notes

- The program moves funds along four paths: authority to vault (init and register_asset), vault to authority (revoke), vault to heir (claim), and vault to treasury (the fee portion of any claim or revoke). Every path is gated by signer checks, address constraints, and state invariants.
- Pausing is delegate-only when a delegate is configured. An estate with no delegate cannot be paused.
- `update_field` accepts two signers: the authority (full permissions, can change timers and label) and the optional `hb_signer` (heartbeat only, all field updates are rejected). This lets users keep a low-stakes hot wallet for daily pings without exposing the cold authority key.
- The treasury address is enforced on-chain by an address constraint on the relevant account. Routing fees to a different address is rejected at the program level.
- Estate and vault PDAs are closed inline by the program once `claimable_assets` reaches zero on a claim or revoke. There is no separate close instruction.
- The frontend never handles private keys. All signing happens inside the user's wallet via `@wallet-ui/react`.
- The deployed program publishes a `security_txt` contact block (`info@heirlm.xyz`, `@heirloom_app`).
