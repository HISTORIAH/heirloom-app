# Heirloom

**Don't let your crypto die with you**

## Overview

Heirloom is a Solana-native inheritance protocol. It lets any wallet holder lock SOL and SPL tokens into a programmatic estate that transfers to a designated heir if the owner goes silent for too long. No lawyers. No custodians. No probate court. Just a heartbeat, a grace period, and a public key.

The owner (the "authority") configures two clocks when creating an estate: a heartbeat interval and a grace period. As long as the authority pings the program before the heartbeat expires, the estate stays locked to them and nobody else can touch it. If the heartbeat lapses and the grace period runs out, the heir - and only the heir - can claim the full vault on-chain. The authority can also name an optional delegate who is allowed to pause the clock on their behalf (useful for planned absences like travel, surgery, or detainment).

Heirloom replaces the opaque, jurisdictional, and often adversarial machinery of traditional estate transfer with a transparent, deterministic smart contract that runs on the Solana runtime.

## Tagline

> Your keys outlive you. Your wealth should too.

## Core Concepts

- **Estate** - a PDA account that encodes the owner, heir, schedule, and status of a single inheritance arrangement.
- **Vault** - a sibling PDA that custodies the deposited SOL and token accounts. Funds live here, not in the estate record.
- **Heartbeat** - a no-op transaction from the authority that resets the inactivity clock. Think of it as a pulse.
- **Grace period** - an extra buffer after a missed heartbeat, during which the owner can still recover.
- **Pause / defer** - a time-boxed freeze on the heartbeat countdown, invokable by an optional delegate, for when the owner is knowingly unreachable.
- **Claim** - the irreversible transfer of all vault assets to the heir once the estate reaches the `claimable` state.
- **Revoke** - owner-initiated dismantling of an estate before the heir claims, returning all assets to the authority.

## End-to-End User Flow

Meet **Alice**. She is a long-term SOL holder and a mother of one. She wants her six-year-old daughter **Mia** to inherit her on-chain savings if anything happens to her, without handing over her seed phrase or trusting a centralized custodian. Alice also has a best friend, **Bob**, a lawyer she trusts to manage her affairs if she is ever incapacitated.

### 1. Alice creates the vault

Alice opens the Heirloom web app, clicks **Connect Wallet**, and signs in with her Solflare wallet. She lands on `/create-vault` and fills in the form:

- **Heir**: Mia's wallet address (a custodial wallet Alice manages for now, which Mia will rotate to her own key at eighteen).
- **Label**: `Mia trust`.
- **Heartbeat interval**: 90 days.
- **Grace period**: 30 days.
- **Pause duration**: 60 days (the maximum she can freeze the clock in one go).
- **Delegate**: Bob's wallet address.
- **Initial deposit**: 500 SOL plus 10,000 USDC.

She clicks **Create Estate**. The app composes a single Solana transaction bundling the `initialize` instruction, then `register_asset` and a token transfer for the USDC. Alice approves in her wallet. Seconds later, the dashboard shows one active estate card labeled **Mia trust** - state `active`, next heartbeat due in 90 days.

### 2. Alice stays alive

Every few weeks Alice opens the dashboard and clicks **Send Heartbeat**. One signed transaction, one lamport of fee, clock reset to zero. The estate stays in state `active`. Mia cannot claim.

### 3. Alice goes on sabbatical

Alice plans a three-month silent meditation retreat where she will have no device access. Before leaving, she messages Bob. Bob opens Heirloom, connects his own wallet, navigates to `/defer`, enters Alice's authority address and Mia's heir address, and signs the `delegate_defer` instruction. The estate's `paused_until` field jumps forward by Alice's configured pause duration. Even if Alice does not ping for two months, the clock does not advance.

### 4. Alice comes back - or doesn't

**Case A - she returns.** Alice sends a fresh heartbeat. State returns to `active`. Nothing changes.

**Case B - she doesn't.** The pause expires. The heartbeat interval elapses. State transitions to `grace`. Thirty more days pass with no pulse. State transitions to `claimable`. Mia (or her guardian acting with Mia's key) opens `/claim`, connects the heir wallet, and signs a single transaction. The vault drains: 500 SOL and 10,000 USDC land in Mia's associated token accounts. The estate is marked `distributed`. The PDAs are closed. Rent is reclaimed. It is final.

### 5. Alice changes her mind

At any time before the claim, Alice can:

- **Update heir** - rotate Mia's address to a new key after she comes of age.
- **Revoke** - dismantle the estate and pull all assets back to her own wallet.
- **Update fields** - change the heartbeat cadence or grace window.

None of these are available to anyone but the authority. The contract enforces it.

## Architecture

```
+----------------------+         +--------------------------+
|  React + Vite SPA    | ──────▶ |  @historiah/heirloom     |
|  (heirloom-app/app)  |         |  (clients/js, generated) |
+----------+-----------+         +-------------+------------+
           │                                   │
           │  wallet signing                   │  instruction + account codecs
           ▼                                   ▼
     +------------+                   +-----------------------+
     | @solana/kit|  RPC / tx ──────▶ |  Heirloom Program     |
     |  + gill    |                   |  (Solana on-chain)    |
     +------------+                   +-----------------------+
                                                │
                                                ▼
                                      +-------------------+
                                      |  Estate + Vault    |
                                      |       PDAs         |
                                      +-------------------+
```

Three layers, one contract:

1. **On-chain program** - a Solana smart contract written in Rust using the Quasar framework. Owns the Estate and Vault account schemas, enforces every state transition, holds custody of deposited assets.
2. **Generated clients** - strongly-typed instruction builders, account decoders, PDA derivers, and error types. Generated directly from the program's IDL by Codama into JavaScript (consumed by the app) and Rust (consumed by the test suite and any off-chain tooling).
3. **React SPA** - the only user-facing surface. Handles wallet connection, estate discovery, human-readable state rendering, and transaction construction. Never speaks to the program directly; always through the generated client.

### Why this split matters

The generated client is the load-bearing boundary. When the on-chain program changes an instruction signature, regenerating the clients propagates the type change into the app at compile time. A breaking program update that the app forgets to handle will fail `tsc`, not production.

## Repository Layout

```
heirloom-app/
├── heirloom-program/         Rust smart contract (Quasar / Solana)
│   ├── src/
│   │   ├── lib.rs            Program entrypoint, instruction dispatch
│   │   ├── state.rs          Estate + Vault account definitions
│   │   ├── constants.rs      Fee rates, bps denominators, limits
│   │   ├── errors.rs         Typed program errors
│   │   ├── helpers.rs        Shared on-chain utilities
│   │   └── instructions/     One file per instruction handler
│   │       ├── initialize.rs
│   │       ├── claim.rs
│   │       ├── revoke.rs
│   │       ├── defer.rs
│   │       ├── update_fields.rs
│   │       ├── update_heir.rs
│   │       ├── register_asset.rs
│   │       └── close_estate.rs
│   ├── Cargo.toml
│   └── Quasar.toml           Toolchain + test framework config
│
├── clients/                  IDL-generated client libraries
│   ├── js/                   @historiah/heirloom - consumed by the app
│   │   └── src/
│   │       ├── generated/    Codama output (do not edit by hand)
│   │       ├── overrides/    Manual patches for edge cases
│   │       └── main.ts       Public entry point + override re-exports
│   └── rust/                 heirloom-program-client - consumed by tests
│       └── src/generated/
│
├── app/                      React + Vite frontend (see app/README.md)
│   ├── src/
│   │   ├── pages/            Index, CreateVault, Dashboard, Claim, Defer
│   │   ├── components/       Landing sections + reusable UI
│   │   ├── contexts/         WalletContext, VaultContext
│   │   ├── hooks/            Token balance hooks, UI hooks
│   │   ├── lib/contracts.ts  Single gateway to the generated client
│   │   └── config/           RPC URLs, program ID, mints
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── tests/                    Integration test suite (Bun + quasar-svm)
│   ├── initialize.test.ts
│   ├── claim.test.ts
│   ├── updateFields.test.ts
│   ├── updateHeir.test.ts
│   └── setup.ts
│
├── scripts/
│   └── convert-idl.ts        Adapts Quasar IDL to Codama-ingestible shape
│
├── codama.json               Codama config: IDL path + renderer targets
├── turbo.json                Turborepo pipeline
├── package.json              Monorepo root (yarn workspaces)
└── README.md                 You are here
```

## Tools and Technologies

**On-chain**
- Rust (edition 2021)
- [Quasar](https://github.com/blueshift-gg/quasar) - Anchor-inspired framework for Solana programs
- `solana-account-view`, `solana-instruction` - low-level Solana primitives

**Client generation**
- [Codama](https://github.com/codama-idl/codama) - IDL-driven multi-language client generator
- `@codama/renderers-js` and `@codama/renderers-rust` - target-specific renderers
- `@codama/nodes-from-anchor` - bridges Anchor-style IDL into Codama's AST

**Frontend**
- React 18 + TypeScript 5.6
- Vite 6 (dev server + bundler)
- Tailwind CSS 3 + `tailwindcss-animate`
- Radix UI primitives (Dialog, Toast, Tooltip, Slot)
- `lucide-react` iconography
- `react-router-dom` v6
- `@tanstack/react-query` for async state
- `sonner` for transient toasts

**Solana integration**
- `@solana/kit` - modern tree-shakable Solana client SDK (v6)
- `@wallet-ui/react` - wallet connection modal and signer adapter
- `@solana-program/system`, `@solana-program/token` - SPL Token + System Program instruction builders
- `gill` - RPC helpers

**Tooling and infrastructure**
- Yarn 4 workspaces (root package manager)
- Bun (test runner for the TypeScript integration suite)
- Turborepo (monorepo task pipeline)
- `quasar-svm` (Solana VM harness for Rust tests)

## On-Chain Instructions

| Discriminator | Instruction      | Signer    | Purpose                                                                 |
| ------------- | ---------------- | --------- | ----------------------------------------------------------------------- |
| 0             | `initialize`     | authority | Create an estate + vault, deposit initial SOL, configure timers         |
| 1             | `claim`          | heir      | Drain the vault to the heir once the estate is claimable                |
| 3             | `update_fields`  | authority | Reset heartbeat and/or change interval, grace, pause duration           |
| 4             | `revoke`         | authority | Dismantle an estate and reclaim all assets                              |
| 5             | `delegate_defer` | delegate  | Freeze the heartbeat clock for the configured pause duration            |
| 6             | `update_heir`    | authority | Migrate the estate to a different heir address                          |
| 7             | `register_asset` | authority | Add a new SPL token asset to an existing estate (paired with a deposit) |
| 8             | `close_estate`   | authority | Reclaim rent from a stale or drained estate                             |

Accounts: `Estate` (discriminator 1, PDA seeds `[b"estate", authority, heir]`) and `Vault` (discriminator 2, PDA seeds `[b"vault", authority, heir]`).

## Getting Started

### Prerequisites

- Node.js 18+ and Yarn 4
- Bun 1.1+ (for tests and IDL conversion)
- Rust stable + the Solana toolchain (for building the program)
- A funded devnet wallet (use `yarn airdrop` or `solana airdrop`)

### Install

```bash
yarn install
```

### Build the program and regenerate clients

```bash
# Inside heirloom-program/ build with your Solana toolchain of choice,
# then from the repo root:
yarn generate:clients
```

This runs `scripts/convert-idl.ts` to normalize the Quasar IDL, then invokes Codama to emit both the JS and Rust client crates.

### Run the frontend

```bash
yarn dev:ui
```

Vite serves the app on `http://localhost:5173`. The default network is devnet; override with environment variables:

```bash
VITE_NETWORK=localnet
VITE_RPC_URL=http://127.0.0.1:8899
VITE_RPC_WS_URL=ws://127.0.0.1:8900
VITE_PROGRAM_ID=JE2LFHb9zAwSM533gd79XJXyByZvVwoy8nYxhCsiAnKN
VITE_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

### Run the tests

```bash
yarn test
```

The test suite exercises every instruction through the generated Rust client against a `quasar-svm` in-process Solana VM, so no validator is required.

### Deploy

```bash
yarn deploy
```

## Networks

| Network      | Program ID                                     | Status    |
| ------------ | ---------------------------------------------- | --------- |
| devnet       | `JE2LFHb9zAwSM533gd79XJXyByZvVwoy8nYxhCsiAnKN` | Live      |
| localnet     | same                                           | On demand |
| mainnet-beta | -                                              | Pending   |

## Security Notes

- The program only moves funds along three paths: authority → vault (init and register_asset), vault → authority (revoke), vault → heir (claim). Every path is gated by signer checks and state invariants.
- Pausing is delegate-only when a delegate is configured. An estate with no delegate cannot be paused.
- `close_estate` is a recovery path for drained or orphaned estates and does not touch funds. It will be removed once on-chain housekeeping is no longer needed.
- The frontend never handles private keys. All signing happens inside the user's wallet via `@wallet-ui/react`.

