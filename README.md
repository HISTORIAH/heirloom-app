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
- **Vault**: a sibling PDA that custodies the deposited SOL and token accounts. Funds live here, not in the estate record.
- **Heartbeat**: a no-op transaction that resets the inactivity clock. Think of it as a pulse. The authority can sign one, and so can an optional `hb_signer` hot wallet if one was configured.
- **Grace period**: an extra buffer after a missed heartbeat, during which the owner can still recover.
- **Pause / defer**: a time-boxed freeze on the heartbeat countdown, invokable by an optional delegate, for when the owner is knowingly unreachable.
- **Claim**: the irreversible transfer of all vault assets to the heir once the estate reaches the `claimable` state. A small protocol fee is routed to the treasury; the remainder lands in the heir's wallet.
- **Revoke**: owner-initiated dismantling of an estate before the heir claims, returning the assets to the authority minus the emergency-exit protocol fee.
- **Hot signer (`hb_signer`)**: an optional secondary wallet whose only power is to call `update_fields` and refresh the heartbeat. Useful for routine pings from a low-value device without exposing the authority key.
- **Treasury**: a protocol-owned address that collects the claim and emergency-exit fees. The current treasury is `tr31o8FF9v2rEukh84ZwjRQgYa3x74PHssighePMP1Q`.

## Protocol Fees

| Path                | Rate            | Constant                  |
| ------------------- | --------------- | ------------------------- |
| Heir claim          | 0.75% (75 bps)  | `CLAIM_FEE_BPS`           |
| Authority revoke    | 0.5% (50 bps)   | `EMERGENCY_EXIT_FEE_BPS`  |

Fees are computed per asset on the gross balance at the moment of transfer. SOL fees move lamports directly to the treasury; SPL fees use `transfer_checked` into the treasury's ATA, which the program creates idempotently if it does not yet exist.

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

Every few weeks Alice opens the dashboard and clicks **Send Heartbeat**, or she pulls out her Pulse phone wallet, visits `/heartbeat`, looks up the estate by authority and heir, and signs a single transaction from there. Either path lands the same `update_fields` instruction on-chain with no field changes; the program treats it as a pulse and resets `last_heartbeat`. The estate stays in state `active`. Mia cannot claim.

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
                                      |  Estate + Vault   |
                                      |       PDAs        |
                                      |   Treasury fees   |
                                      +-------------------+
```

Three layers, one contract:

1. **On-chain program**: a Solana smart contract written in Rust using the Quasar framework. Owns the Estate and Vault account schemas, enforces every state transition, holds custody of deposited assets, computes and routes protocol fees, and closes accounts inline once they are drained.
2. **Generated clients**: strongly-typed instruction builders, account decoders, PDA derivers, and error types. Generated directly from the program's IDL by Codama into JavaScript (consumed by the app) and Rust (consumed by the test suite and any off-chain tooling). A small set of hand-written overrides shadow the generated codecs where Quasar's wire format diverges from what Codama infers.
3. **React SPA**: the only user-facing surface. Handles wallet connection, estate discovery, human-readable state rendering, and transaction construction. Never speaks to the program directly; always through the generated client.

### Why this split matters

The generated client is the load-bearing boundary. When the on-chain program changes an instruction signature, regenerating the clients propagates the type change into the app at compile time. A breaking program update that the app forgets to handle will fail `tsc`, not production.

## Repository Layout

```
heirloom-app/
├── heirloom-program/         Rust smart contract (Quasar / Solana)
│   ├── src/
│   │   ├── lib.rs            Program entrypoint, instruction dispatch
│   │   ├── state.rs          Estate + Vault account definitions
│   │   ├── constants.rs      Fee rates, bps denominators, treasury address
│   │   ├── errors.rs         Typed program errors
│   │   ├── helpers.rs        Fee math, distribution helpers, account close
│   │   └── instructions/     One file per instruction handler
│   │       ├── initialize.rs
│   │       ├── claim.rs
│   │       ├── revoke.rs
│   │       ├── defer.rs
│   │       ├── update_fields.rs
│   │       ├── update_heir.rs
│   │       └── register_asset.rs
│   ├── Cargo.toml
│   └── Quasar.toml           Toolchain + test framework config
│
├── clients/                  IDL-generated client libraries
│   ├── js/                   @historiah/heirloom, consumed by the app
│   │   └── src/
│   │       ├── generated/    Codama output (do not edit by hand)
│   │       ├── overrides/    Manual codec patches (estate, initialize,
│   │       │                 updateFields, pda)
│   │       ├── constants.ts  Treasury address + protocol constants
│   │       └── main.ts       Public entry point + override re-exports
│   └── rust/                 heirloom-program-client, consumed by tests
│       └── src/generated/
│
├── app/                      React + Vite frontend (see app/README.md)
│   ├── src/
│   │   ├── pages/            Index, CreateVault, Dashboard, Claim,
│   │   │                     Defer, Heartbeat, NotFound
│   │   ├── components/       Landing sections + reusable UI
│   │   │                     (TokenAvatar, WalletPill, ConfirmDialog, …)
│   │   ├── contexts/         WalletContext, VaultContext
│   │   ├── hooks/            Token balances, token metadata, UI hooks
│   │   ├── lib/
│   │   │   ├── contracts.ts  Single gateway to the generated client
│   │   │   └── heliusDas.ts  Helius DAS API client for token enrichment
│   │   └── config/           RPC URLs, program ID, mints, Helius keys
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── tests/                    Integration test suite (Bun + quasar-svm)
│   ├── initialize.test.ts
│   ├── claim.test.ts
│   ├── revoke.test.ts
│   ├── registerAssets.test.ts
│   ├── updateFields.test.ts
│   ├── updateHeir.test.ts
│   ├── updateHeirAndClaim.test.ts
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

## Cross-chain (IKA) variant

The repo also ships a separate cross-chain frontend, `app-ika/`, which extends Heirloom beyond Solana-native assets to EVM chains and Bitcoin via the [Ika](https://ika.xyz) threshold-MPC network and the companion `heirloom-ika-program` Solana program.

For detailed info on IKA integration, the dWallet lifecycle, passkey heartbeats, MetaMask claim flow, the CPI into Ika's `approve_message`, the full account set on `claim` / `revoke`, and end-to-end flows, read:

- [app-ika/README.md](./app-ika/README.md) - frontend integration and `heirloom-ika-program` interaction reference

## Tools and Technologies

**On-chain**

- Rust (edition 2021)
- [Quasar](https://github.com/blueshift-gg/quasar), an Anchor-inspired framework for Solana programs
- `solana-account-view`, `solana-instruction`, low-level Solana primitives
- `quasar-spl` for SPL Token CPIs, ATA creation, and mint introspection

**Client generation**

- [Codama](https://github.com/codama-idl/codama), an IDL-driven multi-language client generator
- `@codama/renderers-js` and `@codama/renderers-rust`, target-specific renderers
- `@codama/nodes-from-anchor`, bridges Anchor-style IDL into Codama's AST

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

- `@solana/kit`, modern tree-shakable Solana client SDK (v6)
- `@wallet-ui/react`, wallet connection modal and signer adapter
- `@solana-program/system`, `@solana-program/token`, SPL Token + System Program instruction builders
- `gill`, RPC helpers
- Helius DAS API for token metadata and image enrichment (optional, via `VITE_HELIUS_API_KEY`)

**Tooling and infrastructure**

- Bun (root package manager and test runner for the TypeScript integration suite)
- Turborepo (monorepo task pipeline)
- `quasar-svm` (Solana VM harness for Rust tests)

## On-Chain Instructions

| Discriminator | Instruction      | Signer               | Purpose                                                                 |
| ------------- | ---------------- | -------------------- | ----------------------------------------------------------------------- |
| 0             | `initialize`     | authority            | Create an estate + vault, deposit initial SOL or token, configure timers, optional delegate, optional `hb_signer` |
| 1             | `claim`          | heir                 | Drain a single vault asset to the heir once the estate is claimable, take protocol fee, close PDAs when the last asset clears |
| 3             | `update_fields`  | authority or `hb_signer` | Reset heartbeat and optionally change interval, grace, pause duration, or label |
| 4             | `revoke`         | authority            | Dismantle an estate one asset at a time, take emergency-exit fee, close PDAs when the last asset clears |
| 5             | `delegate_defer` | delegate             | Freeze the heartbeat clock for the configured pause duration            |
| 6             | `update_heir`    | authority            | Migrate the estate to a different heir address                          |
| 7             | `register_asset` | authority            | Add a new SPL token asset (or top up SOL) on an existing estate         |

Accounts: `Estate` (discriminator 1, PDA seeds `[b"estate", authority, heir]`) and `Vault` (discriminator 2, PDA seeds `[b"vault", authority, heir]`).

The `Estate` record stores `authority`, `heir`, `heartbeat_interval`, `grace_period`, `last_heartbeat`, `created_at`, `bump`, `is_claimed`, `pause_duration`, `paused_until`, `is_deferred`, `delegate: Option<Address>`, `hb_signer: Option<Address>`, `claimable_assets: u8` (the number of vault token accounts still open under the estate, plus one if the SOL balance is still claimable), and `label: String<32>`.

`claim` and `revoke` are designed to be bundled per asset in a single transaction by the client. The app provides `sendClaimAll` and `sendRevokeAll` wrappers that order tokens before SOL (since draining SOL closes the vault) and dispatch all instructions in one signed transaction.

## Getting Started

### Prerequisites

- Node.js 18+
- Bun 1.1+ (for project initialization, tests, and IDL conversion)
- Rust stable + the Solana toolchain (for building the program)
- A funded devnet wallet (use `solana airdrop [int]`)

### Install

```bash
bun install
```

### Build the program and regenerate clients

```bash
# Inside heirloom-program/ build with your Solana toolchain of choice,
# then from the repo root:
bun generate:clients
```

This runs `scripts/convert-idl.ts` to normalize the Quasar IDL, then invokes Codama to emit both the JS and Rust client crates. The JS overrides in `clients/js/src/overrides/` re-export shadowed identifiers so consumers always import from `@historiah/heirloom` and get the corrected codecs.

### Run the frontend

```bash
bun dev:ui
```

Vite serves the app on `http://localhost:5173`. The default network is devnet; override with environment variables:

```bash
VITE_NETWORK=localnet
VITE_RPC_URL=http://127.0.0.1:8899
VITE_RPC_WS_URL=ws://127.0.0.1:8900
VITE_PROGRAM_ID=JE2LFHb9zAwSM533gd79XJXyByZvVwoy8nYxhCsiAnKN
VITE_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
VITE_HELIUS_API_KEY=...              # optional, enables token metadata
VITE_HELIUS_RPC_URL=...               # optional, overrides default Helius RPC
```

When a Helius API key is set, the app uses Helius RPC endpoints by default and enriches token displays via the Helius DAS API.

### Run the tests

```bash
bun test
```

The test suite exercises every instruction (including multi-asset register, revoke, claim, heir reassignment, and claim-after-heir-rotation flows) through the generated Rust client against a `quasar-svm` in-process Solana VM, so no validator is required.

### Deploy

```bash
bun deploy
```

## Networks

| Network      | Program ID                                     | Status    |
| ------------ | ---------------------------------------------- | --------- |
| devnet       | `JE2LFHb9zAwSM533gd79XJXyByZvVwoy8nYxhCsiAnKN` | Live      |
| localnet     | same                                           | On demand |
| mainnet-beta | -                                              | Pending   |

## Security Notes

- The program moves funds along four paths: authority to vault (init and register_asset), vault to authority (revoke), vault to heir (claim), and vault to treasury (the fee portion of any claim or revoke). Every path is gated by signer checks, address constraints, and state invariants.
- Pausing is delegate-only when a delegate is configured. An estate with no delegate cannot be paused.
- `update_fields` accepts two signers: the authority (full permissions, can change timers and label) and the optional `hb_signer` (heartbeat only, all field updates are rejected). This lets users keep a low-stakes hot wallet for daily pings without exposing the cold authority key.
- The treasury address is enforced on-chain by an `address = TREASURY_ADDRESS` constraint on the relevant account. Routing fees to a different address is rejected at the program level.
- Estate and vault PDAs are closed inline by the program once `claimable_assets` reaches zero on a claim or revoke. There is no separate close instruction.
- The frontend never handles private keys. All signing happens inside the user's wallet via `@wallet-ui/react`.