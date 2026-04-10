# Heirloom -- Trustless Digital Asset Inheritance on Solana

Heirloom is a heartbeat-based inheritance protocol built on Solana. It allows users to lock SOL and SPL tokens into a vault, designate heirs with percentage-based splits, and guarantee trustless distribution of assets if the vault owner becomes inactive. No lawyers, no custodians, no seed phrase sharing.

The protocol is composed of two parts:

- **On-chain program** -- An Anchor smart contract deployed to Solana that manages vaults, deposits, heartbeats, and claims.
- **Frontend application** -- A React single-page application that provides wallet connectivity, vault creation wizards, owner dashboards, and an heir claim portal.

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [Architecture Overview](#architecture-overview)
3. [On-Chain Program](#on-chain-program)
   - [Program ID and PDA Scheme](#program-id-and-pda-scheme)
   - [Account Structure](#account-structure)
   - [Instructions](#instructions)
   - [Vault State Machine](#vault-state-machine)
   - [Token Flow](#token-flow)
   - [Access Control](#access-control)
   - [Error Codes](#error-codes)
   - [Constants](#constants)
4. [Frontend Application](#frontend-application)
   - [Tech Stack](#tech-stack)
   - [Project Structure](#project-structure)
   - [Routing](#routing)
   - [State Management](#state-management)
   - [Contract Integration](#contract-integration)
   - [Configuration and Environment Variables](#configuration-and-environment-variables)
5. [End-to-End User Flows](#end-to-end-user-flows)
   - [Vault Owner Flow](#vault-owner-flow)
   - [Heir Claim Flow](#heir-claim-flow)
   - [Guardian Flow](#guardian-flow)
   - [Emergency Withdraw Flow](#emergency-withdraw-flow)
6. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Building the On-Chain Program](#building-the-on-chain-program)
   - [Running the Frontend](#running-the-frontend)
   - [Deploying to Devnet](#deploying-to-devnet)
7. [Testing](#testing)
8. [Security Considerations](#security-considerations)

---

## How It Works

Heirloom implements a dead man's switch for digital assets:

1. **Create a vault.** The owner connects a Solana wallet, defines a heartbeat interval (for example, 90 days), a grace period (for example, 30 days), and up to 10 heirs with percentage-based splits that must total 100%.

2. **Deposit tokens.** The owner deposits SOL and/or USDC (or any two SPL tokens) into the vault. Tokens are held by a Program Derived Address (PDA) that only the on-chain program can sign for.

3. **Send heartbeats.** The owner periodically signs a heartbeat transaction. Each heartbeat resets the countdown timer. This is a single-click operation with no token cost beyond the Solana network fee.

4. **Grace period triggers.** If the owner misses a heartbeat and the interval expires, the vault enters a grace period. The owner can still send a heartbeat during this window to reset the timer. An optional guardian can extend the deadline by 30 days (one-time use).

5. **Heirs claim.** If the heartbeat interval plus the grace period (plus any guardian extension) passes without a heartbeat, any registered heir can claim their proportional share of the vault's tokens. Once all heirs have claimed, the vault is marked as distributed.

6. **Emergency withdraw.** At any point before distribution, the owner can reclaim all deposited tokens and close the vault.

---

## Architecture Overview

```
+---------------------------+         +----------------------------------+
|     Frontend (React)      |         |   Solana On-Chain Program        |
|                           |         |   (Anchor / Rust)                |
|  - Wallet Connection      |  RPC    |                                  |
|  - Vault Creation Wizard  | ------> |  create_vault                    |
|  - Owner Dashboard        |         |  deposit                         |
|  - Heir Claim Portal      |         |  heartbeat                       |
|  - Token Balance Display  |         |  claim                           |
|                           |         |  emergency_withdraw              |
|  Contexts:                |         |  guardian_pause                   |
|  - WalletContext          |         |  update_heirs                    |
|  - VaultContext            |         |                                  |
|                           |         |  State:                          |
|  Libs:                    |         |  - Vault PDA (per owner)         |
|  - contracts.ts (Anchor)  |         |  - Token ATAs (PDA-controlled)   |
|  - idl.json               |         |  - Heir entries (up to 10)       |
+---------------------------+         +----------------------------------+
        |                                       |
        |           Solana RPC                   |
        +---------------------------------------+
                        |
              +-------------------+
              |  Solana Cluster   |
              |  (devnet / local) |
              +-------------------+
```

The frontend communicates with the Solana cluster through `@solana/web3.js` and `@coral-xyz/anchor`. All vault state lives on-chain in a single PDA account per owner. Token custody is enforced by the program -- the vault PDA holds Associated Token Accounts (ATAs) that only the program can authorize transfers from.

---

## On-Chain Program

The program is written in Rust using the Anchor framework (v1.0) and located at `programs/heirloom-app/src/`.

### Program ID and PDA Scheme

```
Program ID: Bayy9jagJooeKL72hpy6NKTSYVNTBLAj4hSwRXBg7wCJ
```

Each vault is a PDA derived from a single seed scheme:

```
seeds = [b"vault", owner_public_key]
```

This guarantees exactly one vault per owner address. The vault PDA also serves as the authority for Associated Token Accounts that hold the deposited tokens.

When a vault is fully distributed (all heirs claimed or owner emergency-withdrew), the same PDA can be reused to create a new vault.

### Account Structure

#### Vault

The primary on-chain account. Maximum size supports up to 10 heirs.

| Field               | Type             | Size (bytes) | Description                                            |
|---------------------|------------------|--------------|--------------------------------------------------------|
| owner               | Pubkey           | 32           | Wallet address of the vault creator                    |
| token_a_mint        | Pubkey           | 32           | Mint address of the first token (e.g., Wrapped SOL)    |
| token_b_mint        | Pubkey           | 32           | Mint address of the second token (e.g., USDC)          |
| heartbeat_interval  | i64              | 8            | Seconds before the grace period begins                 |
| grace_period        | i64              | 8            | Seconds after the interval before heirs can claim      |
| last_heartbeat      | i64              | 8            | Unix timestamp of the most recent heartbeat            |
| token_a_balance     | u64              | 8            | Current token A amount held in the vault               |
| token_b_balance     | u64              | 8            | Current token B amount held in the vault               |
| guardian            | Option\<Pubkey\> | 33           | Optional guardian who can extend the deadline once      |
| guardian_pause_used | bool             | 1            | Whether the guardian has used their one-time pause      |
| is_distributed      | bool             | 1            | Whether the vault has been fully distributed or closed  |
| created_at          | i64              | 8            | Unix timestamp of vault creation                       |
| heir_count          | u8               | 1            | Number of registered heirs (1-10)                      |
| claims_count        | u8               | 1            | Number of heirs who have claimed their share            |
| bump                | u8               | 1            | PDA bump seed                                          |
| heirs               | Vec\<HeirEntry\> | up to 364    | Array of heir entries (max 10)                         |

#### HeirEntry

Nested within the Vault's `heirs` vector.

| Field      | Type   | Size (bytes) | Description                                |
|------------|--------|--------------|--------------------------------------------|
| heir       | Pubkey | 32           | Wallet address of the heir                 |
| split_bps  | u16    | 2            | Allocation in basis points (100 bps = 1%)  |
| has_claimed| bool   | 1            | Whether this heir has claimed their share   |
| is_active  | bool   | 1            | Whether this heir entry is active           |

#### HeirInput

Used as an instruction parameter (not stored on-chain directly).

| Field     | Type   | Description                        |
|-----------|--------|------------------------------------|
| heir      | Pubkey | Heir wallet address                |
| split_bps | u16    | Allocation in basis points (0-10000)|

### Instructions

The program exposes seven instructions:

#### 1. create_vault

Creates a new vault or reinitializes a previously distributed vault.

**Parameters:**
- `heartbeat_interval: i64` -- seconds before the grace period starts
- `grace_period: i64` -- seconds after the heartbeat interval before heirs can claim
- `heirs_data: Vec<HeirInput>` -- 1 to 10 heirs with basis point allocations
- `guardian: Option<Pubkey>` -- optional guardian address

**Accounts:**
- `owner` (signer, mutable) -- the vault creator
- `vault` (PDA, mutable) -- derived from `[b"vault", owner]`
- `token_a_mint` -- mint account for the first token
- `token_b_mint` -- mint account for the second token
- `vault_token_a` (mutable) -- vault's ATA for token A (created if needed)
- `vault_token_b` (mutable) -- vault's ATA for token B (created if needed)
- `system_program`, `token_program`, `associated_token_program`

**Validation:**
- Vault must be new (`created_at == 0`) or previously distributed (`is_distributed == true`)
- Between 1 and 10 heirs required
- Heir `split_bps` values must sum to exactly 10000

**Effect:**
- Initializes all vault fields
- Sets `last_heartbeat` to the current block timestamp
- Sets `token_a_balance` and `token_b_balance` to 0
- Creates ATAs for the vault PDA if they do not exist

#### 2. deposit

Transfers SPL tokens from the owner's wallet into the vault.

**Parameters:**
- `amount: u64` -- number of tokens in raw units (accounting for decimals)

**Accounts:**
- `owner` (signer, mutable) -- must match `vault.owner`
- `vault` (PDA, mutable)
- `mint` -- the token mint being deposited (must match `token_a_mint` or `token_b_mint`)
- `owner_token_account` (mutable) -- owner's ATA for this token
- `vault_token_account` (mutable) -- vault's ATA for this token
- `token_program`

**Validation:**
- Vault must not be distributed
- Amount must be greater than zero
- Mint must match one of the vault's configured token mints

**Effect:**
- Executes an SPL Token transfer from owner to vault
- Increments `token_a_balance` or `token_b_balance` accordingly

#### 3. heartbeat

Resets the inactivity countdown by updating the last heartbeat timestamp.

**Parameters:** None

**Accounts:**
- `owner` (signer) -- must match `vault.owner`
- `vault` (PDA, mutable)

**Validation:**
- Vault must not be distributed

**Effect:**
- Sets `last_heartbeat` to the current block timestamp

#### 4. claim

Allows a registered heir to claim their proportional share of the vault's tokens after the deadline has passed.

**Parameters:** None

**Accounts:**
- `heir` (signer, mutable) -- the heir claiming tokens
- `vault_owner` -- the vault owner's public key (for PDA derivation)
- `vault` (PDA, mutable)
- `token_a_mint`, `token_b_mint` -- must match vault configuration
- `vault_token_a`, `vault_token_b` (mutable) -- vault's ATAs
- `heir_token_a`, `heir_token_b` (mutable) -- heir's ATAs (created if needed)
- `system_program`, `token_program`, `associated_token_program`

**Validation:**
- Vault must not already be distributed
- Elapsed time since last heartbeat must exceed the effective deadline (interval + grace + guardian bonus)
- The signer must be a registered active heir
- The heir must not have already claimed

**Share calculation (using u128 intermediate to prevent overflow):**
```
token_a_share = vault.token_a_balance * heir.split_bps / 10000
token_b_share = vault.token_b_balance * heir.split_bps / 10000
```

**Effect:**
- Transfers the heir's share of token A and token B from vault to heir
- Marks the heir as `has_claimed = true`
- Decrements vault balances
- Increments `claims_count`
- If `claims_count == heir_count`, sets `is_distributed = true`

#### 5. emergency_withdraw

Allows the vault owner to reclaim all deposited tokens and close the vault at any time.

**Parameters:** None

**Accounts:**
- `owner` (signer, mutable) -- must match `vault.owner`
- `vault` (PDA, mutable)
- `token_a_mint`, `token_b_mint`
- `vault_token_a`, `vault_token_b` (mutable)
- `owner_token_a`, `owner_token_b` (mutable) -- owner's ATAs (created if needed)
- `system_program`, `token_program`, `associated_token_program`

**Validation:**
- Vault must not already be distributed

**Effect:**
- Transfers all token A and token B from vault back to the owner
- Sets both balances to zero
- Sets `is_distributed = true`

#### 6. guardian_pause

Extends the claim deadline by 30 days. Can only be used once per vault, and only during the grace period.

**Parameters:** None

**Accounts:**
- `guardian` (signer) -- must match `vault.guardian`
- `vault_owner` -- owner's public key (for PDA derivation)
- `vault` (PDA, mutable)

**Validation:**
- The signer must be the vault's designated guardian
- The vault must be in the grace period (elapsed >= heartbeat_interval AND elapsed < heartbeat_interval + grace_period)
- The guardian pause must not have been used already

**Effect:**
- Sets `guardian_pause_used = true`
- The effective deadline is now extended by 2,592,000 seconds (30 days)

#### 7. update_heirs

Replaces the vault's heir configuration with a new set of heirs.

**Parameters:**
- `new_heirs: Vec<HeirInput>` -- 1 to 10 heirs with basis point allocations

**Accounts:**
- `owner` (signer) -- must match `vault.owner`
- `vault` (PDA, mutable)

**Validation:**
- Vault must not be distributed
- Between 1 and 10 heirs required
- `split_bps` values must sum to exactly 10000

**Effect:**
- Replaces the entire `heirs` vector
- Resets all `has_claimed` flags to false
- Resets `claims_count` to 0
- Updates `heir_count`

### Vault State Machine

The vault progresses through four states based on the elapsed time since the last heartbeat:

```
                        heartbeat()
                    +-----resets------+
                    |                 |
                    v                 |
+----------+   interval   +-------+  |   grace_period    +-----------+
| CREATED  | -----------> | GRACE | -+- ----------------> | CLAIMABLE |
+----------+   expires    +-------+    (+guardian bonus)   +-----------+
     |                        |                                 |
     |                        |     heartbeat()                 |  all heirs
     +--- deposit() -----+   +---- resets to ACTIVE            |  claim()
     +--- heartbeat() ---+                                     v
     +--- update_heirs()-+                              +-------------+
                                                        | DISTRIBUTED |
              emergency_withdraw()                      +-------------+
              (from any non-distributed state)                ^
              --------> sets is_distributed = true -----------+
```

**State definitions:**

| State       | Condition                                                                | Owner actions           | Heir actions |
|-------------|--------------------------------------------------------------------------|-------------------------|--------------|
| Active      | `elapsed < heartbeat_interval`                                           | deposit, heartbeat, update_heirs, emergency_withdraw | None |
| Grace       | `elapsed >= heartbeat_interval` AND `elapsed < effective_deadline`        | deposit, heartbeat, update_heirs, emergency_withdraw | None (guardian can pause) |
| Claimable   | `elapsed >= effective_deadline` AND `is_distributed == false`             | emergency_withdraw      | claim        |
| Distributed | `is_distributed == true`                                                 | create_vault (new)      | None         |

**Effective deadline calculation:**

```
effective_deadline = heartbeat_interval + grace_period + (guardian_pause_used ? 2,592,000 : 0)
```

**Example timeline:**

Suppose a vault is created with a 90-day heartbeat interval and a 30-day grace period:

- Day 0: Vault created. `last_heartbeat` = now. State: Active.
- Day 45: Owner sends heartbeat. Timer resets. State: Active.
- Day 135 (90 days after last heartbeat): Grace period begins. State: Grace.
- Day 140: Guardian pauses. Deadline extended by 30 days. State: Grace.
- Day 195 (90 + 30 + 30 + 45 days): Deadline passes. State: Claimable.
- Day 196: Heir 1 claims 60% share. Heir 2 claims 40% share. State: Distributed.

### Token Flow

The vault supports two independently tracked SPL tokens (referred to as Token A and Token B).

**Deposit:**
```
Owner's ATA  --(SPL Transfer CPI)-->  Vault's ATA (PDA-controlled)
vault.token_X_balance += amount
```

**Claim (per heir):**
```
share = vault.token_X_balance * heir.split_bps / 10000

Vault's ATA  --(SPL Transfer CPI, PDA signer)-->  Heir's ATA
vault.token_X_balance -= share
```

The vault PDA signs the transfer using seeds `[b"vault", owner_pubkey, bump]`.

**Emergency Withdraw:**
```
Vault's ATA  --(SPL Transfer CPI, PDA signer)-->  Owner's ATA
vault.token_a_balance = 0
vault.token_b_balance = 0
vault.is_distributed = true
```

### Access Control

| Instruction        | Authorized caller      | Enforcement mechanism                                              |
|--------------------|------------------------|--------------------------------------------------------------------|
| create_vault       | Anyone (for themselves)| Signer becomes the owner; PDA derived from signer's key            |
| deposit            | Vault owner only       | `has_one = owner` constraint on the vault account                  |
| heartbeat          | Vault owner only       | `has_one = owner` constraint on the vault account                  |
| claim              | Registered active heir | Linear search in `vault.heirs` for matching signer                 |
| emergency_withdraw | Vault owner only       | `has_one = owner` constraint on the vault account                  |
| guardian_pause      | Designated guardian    | `vault.guardian == Some(signer.key())` check                       |
| update_heirs       | Vault owner only       | `has_one = owner` constraint on the vault account                  |

### Error Codes

| Error             | Description                                                         |
|-------------------|---------------------------------------------------------------------|
| NotHeir           | Caller is not a registered heir in the vault                        |
| NotGuardian       | Caller is not the designated guardian                                |
| VaultNotFound     | Vault PDA does not exist                                             |
| VaultNotClaimable | Effective deadline has not yet passed                                |
| AlreadyClaimed    | This heir has already claimed their share                            |
| InvalidSplits     | Heir split basis points do not sum to 10000, or heirs exceed maximum |
| VaultAlreadyExists| A non-distributed vault already exists for this owner                |
| VaultDistributed  | Vault has already been fully distributed or closed                   |
| GuardianPauseUsed | The guardian's one-time pause has already been used                   |
| NotInGrace        | The vault is not currently in the grace period                       |
| NoBalance         | Deposit amount must be greater than zero                             |
| NotOwner          | The signer is not the vault owner                                    |
| NoHeirs           | At least one heir is required                                        |
| InvalidMint       | The provided token mint does not match the vault's configuration     |
| Overflow          | Arithmetic overflow detected                                         |

### Constants

| Constant             | Value       | Description                                      |
|----------------------|-------------|--------------------------------------------------|
| VAULT_SEED           | `b"vault"`  | PDA seed prefix                                  |
| BASIS_POINTS         | 10,000      | 100% represented in basis points (1 bp = 0.01%)  |
| MAX_HEIRS            | 10          | Maximum number of heirs per vault                 |
| GUARDIAN_PAUSE_BONUS  | 2,592,000   | 30 days in seconds, added when guardian pauses    |

---

## Frontend Application

The frontend is a single-page React application located at `heirloom-app/`.

### Tech Stack

| Layer           | Technology                                                    |
|-----------------|---------------------------------------------------------------|
| Framework       | React 18 with TypeScript 5.6                                  |
| Build tool      | Vite 6                                                        |
| Styling         | Tailwind CSS 3 with a neo-brutalism design system             |
| Font            | Space Grotesk                                                 |
| Routing         | React Router v6                                               |
| Data fetching   | @tanstack/react-query                                         |
| Solana RPC      | @solana/web3.js v1                                            |
| Program client  | @coral-xyz/anchor (JS)                                        |
| Token operations| @solana/spl-token                                             |
| Wallet adapters | @solana/wallet-adapter-react (Phantom, Solflare)              |
| UI components   | Radix UI (Dialog, Toast, Tooltip), Lucide icons               |
| Notifications   | Sonner + Radix Toast                                          |

### Project Structure

```
heirloom-app/
  src/
    main.tsx                   -- Entry point with Buffer polyfill
    App.tsx                    -- Provider stack and route definitions
    index.css                  -- Neo-brutalism design system (CSS custom properties)
    vite-env.d.ts              -- Vite client types and image module declarations

    config/
      constants.ts             -- Network, program ID, token mints, explorer URLs

    contexts/
      WalletContext.tsx         -- Solana wallet adapter integration
      VaultContext.tsx          -- Vault state management with auto-polling

    hooks/
      useTokenBalances.ts      -- Fetches SPL token balances for a wallet
      use-toast.ts             -- Toast notification state management
      use-mobile.tsx           -- Mobile viewport detection

    lib/
      contracts.ts             -- All Anchor program interaction functions
      idl.json                 -- Generated Anchor IDL (copied from target/idl/)
      utils.ts                 -- cn() class name utility

    components/
      ui/
        button.tsx             -- Button with variant system (lime, orange, outline, etc.)
        dialog.tsx             -- Modal dialog (Radix UI)
        toast.tsx              -- Toast notifications (Radix UI)
        toaster.tsx            -- Toast renderer
        sonner.tsx             -- Sonner toast integration
        tooltip.tsx            -- Tooltip (Radix UI)
      NavBar.tsx               -- Navigation with wallet dropdown and balances
      WalletConnectDialog.tsx  -- Wallet selection modal (Phantom, Solflare)
      NavLink.tsx              -- Scroll-to-section navigation link
      HeroSection.tsx          -- Landing page hero with CTA
      HowItWorksSection.tsx    -- Four-step process explanation
      VaultLifecycleSection.tsx-- Visual vault state timeline
      WhySolanaSection.tsx     -- Technical reasons for Solana
      ComparisonSection.tsx    -- Comparison table with other solutions
      FAQSection.tsx           -- Expandable FAQ items
      CTASection.tsx           -- Call-to-action section
      FooterSection.tsx        -- Footer with links and disclaimer

    pages/
      Index.tsx                -- Landing page (assembles all landing sections)
      CreateVault.tsx          -- Four-step vault creation wizard
      Dashboard.tsx            -- Vault owner dashboard with countdown and actions
      Claim.tsx                -- Heir inheritance lookup and claim portal
      NotFound.tsx             -- 404 page

    assets/
      Heirloomapp-hero.png     -- Hero section illustration
```

### Routing

| Path           | Page        | Description                                   |
|----------------|-------------|-----------------------------------------------|
| `/`            | Index       | Marketing landing page with all info sections  |
| `/create-vault`| CreateVault | Four-step vault creation wizard                |
| `/dashboard`   | Dashboard   | Vault owner management interface               |
| `/claim`       | Claim       | Heir inheritance lookup and claim portal       |
| `*`            | NotFound    | 404 error page                                 |

The `/claim` page also accepts a query parameter `?owner=<address>` for direct vault lookup.

### State Management

#### WalletContext

Wraps the Solana wallet adapter libraries and provides:

- `isConnected: boolean` -- whether a wallet is currently connected
- `publicKey: string | null` -- the connected wallet's public key as a base58 string
- `connectWallet()` -- initiates wallet connection (defaults to Phantom if no wallet selected)
- `disconnectWallet()` -- disconnects the current wallet
- `connection: Connection` -- the Solana RPC connection instance
- `wallet` -- the raw wallet adapter object (used to create AnchorProvider instances)

Supported wallets: **Phantom** and **Solflare**.

#### VaultContext

Manages the on-chain vault state for the connected wallet owner:

- `vault: VaultData | null` -- the parsed vault data, or null if no vault exists
- `loading: boolean` -- whether a fetch is in progress
- `error: string | null` -- last error message
- `pendingTxId: string | null` -- most recent transaction signature
- `pendingCreate: boolean` -- whether the app is waiting for vault creation to confirm
- `fetchVault()` -- manually trigger a vault fetch
- `createVaultOnChain(...)` -- calls the create_vault instruction
- `depositTokenAOnChain(amount)` -- calls the deposit instruction for token A
- `depositTokenBOnChain(amount)` -- calls the deposit instruction for token B
- `sendHeartbeatOnChain()` -- calls the heartbeat instruction
- `emergencyWithdrawOnChain()` -- calls the emergency_withdraw instruction
- `clearVault()` -- resets all local state

**Polling behavior:** The context polls the vault account every 15 seconds. When `pendingCreate` is true (vault just created, waiting for on-chain confirmation), polling increases to every 5 seconds.

**State computation:** The vault state (active/grace/claimable/distributed) is computed client-side using the current wall-clock time, `last_heartbeat`, `heartbeat_interval`, `grace_period`, and `guardian_pause_used`.

### Contract Integration

All on-chain interactions are defined in `src/lib/contracts.ts`. The module exports:

**Write functions** (require a connected wallet with signing capability):

| Function              | On-chain instruction | Description                                |
|-----------------------|----------------------|--------------------------------------------|
| `createVault()`       | create_vault         | Initialize vault with heirs and parameters |
| `deposit()`           | deposit              | Transfer tokens into the vault             |
| `sendHeartbeat()`     | heartbeat            | Reset the inactivity countdown             |
| `claimInheritance()`  | claim                | Heir claims their share                    |
| `emergencyWithdraw()` | emergency_withdraw   | Owner reclaims all tokens                  |
| `guardianPause()`     | guardian_pause       | Guardian extends the deadline              |
| `updateHeirs()`       | update_heirs         | Replace the heir configuration             |

**Read functions** (do not require wallet signing):

| Function               | Description                                                      |
|------------------------|------------------------------------------------------------------|
| `fetchVaultAccount()`  | Fetches and deserializes a vault account by owner public key     |
| `lookupSingleVault()`  | Looks up a vault and checks if a specific address is a registered heir |

**PDA derivation:**

```typescript
function getVaultPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    PROGRAM_ID
  );
}
```

### Configuration and Environment Variables

Default configuration targets Solana devnet. All values can be overridden with environment variables prefixed with `VITE_`:

| Variable               | Default                                              | Description                        |
|------------------------|------------------------------------------------------|------------------------------------|
| `VITE_NETWORK`         | `devnet`                                             | Solana cluster (devnet, mainnet-beta) |
| `VITE_RPC_URL`         | `https://api.devnet.solana.com`                      | Solana RPC endpoint                |
| `VITE_PROGRAM_ID`      | `Bayy9jagJooeKL72hpy6NKTSYVNTBLAj4hSwRXBg7wCJ`     | Deployed program address           |
| `VITE_TOKEN_A_MINT`    | `So11111111111111111111111111111111111111112`         | Token A mint (Wrapped SOL)         |
| `VITE_TOKEN_A_LABEL`   | `SOL`                                                | Token A display label              |
| `VITE_TOKEN_A_DECIMALS`| `9`                                                  | Token A decimal places             |
| `VITE_TOKEN_B_MINT`    | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`     | Token B mint (USDC on devnet)      |
| `VITE_TOKEN_B_LABEL`   | `USDC`                                               | Token B display label              |
| `VITE_TOKEN_B_DECIMALS`| `6`                                                  | Token B decimal places             |

The explorer URL helper functions are cluster-aware and automatically append `?cluster=devnet` when not on mainnet-beta.

---

## End-to-End User Flows

### Vault Owner Flow

**1. Connect wallet**

The user arrives at the landing page and clicks "Launch App." A modal offers two wallet options: Phantom and Solflare. After selecting and approving the connection, the navbar updates to show the truncated wallet address and token balances.

**2. Create vault (four-step wizard at `/create-vault`)**

- **Step 0 -- Heartbeat configuration.** The user sets the heartbeat interval (1-365 days) and grace period (1-90 days) using sliders or preset buttons. The UI displays the total deadline (interval + grace period) in real time.

- **Step 1 -- Heir configuration.** The user adds between 1 and 10 heirs. Each heir has a label, a Solana wallet address, and a percentage share. The total must equal exactly 100% (displayed as a color-coded badge: red if over, yellow if under, green if exact). An optional guardian address can be set.

- **Step 2 -- Initial deposit.** The user optionally enters amounts for Token A (SOL) and Token B (USDC). Preset buttons offer common amounts. Deposits can be skipped and made later.

- **Step 3 -- Review and confirm.** The user reviews all settings. Clicking "Create Vault" triggers the on-chain transaction sequence:
  1. `create_vault` instruction is sent and confirmed.
  2. If Token A deposit > 0, a `deposit` instruction is sent.
  3. If Token B deposit > 0, a second `deposit` instruction is sent.
  4. On success, the user is redirected to the dashboard after 3 seconds.

**3. Manage vault (dashboard at `/dashboard`)**

The dashboard displays:

- **Status card** -- color-coded by vault state (green for active, yellow for grace, red for claimable, gray for distributed) with the owner's wallet address (copyable).
- **Countdown timer** -- real-time display of days, hours, minutes, and seconds until the next state transition. Updates every second. The label changes based on state ("Next Heartbeat Due In," "Time Until Claimable," etc.).
- **Token balances** -- current vault holdings for Token A and Token B, displayed in both human-readable and raw units.
- **Heir list** -- all registered heirs with their labels, truncated addresses, percentage shares, calculated token allocations, and claim status.
- **Guardian card** -- displayed if a guardian is configured, showing the guardian address and whether the pause has been used.
- **Send Heartbeat button** -- one-click heartbeat transaction. The button is highlighted with a shake animation during the grace period to create urgency.
- **Emergency Withdraw section** -- a red-bordered card with a confirmation dialog. Transfers all tokens back to the owner and closes the vault permanently.

**4. Ongoing maintenance**

The owner periodically returns to the dashboard and clicks "Send Heartbeat" before the interval expires. Each heartbeat resets the countdown to zero.

### Heir Claim Flow

**1. Navigate to the claim portal**

The heir visits `/claim` (or `/claim?owner=<vault_owner_address>` if given a direct link).

**2. Look up the vault**

If the `?owner=` parameter is present, the page automatically looks up the vault. Otherwise, the heir expands the manual lookup section and enters the vault owner's Solana address. The system calls `lookupSingleVault()` which:

- Derives the vault PDA from the owner address
- Fetches the vault account
- Checks if the connected wallet is a registered active heir
- Computes the current vault state
- Calculates the heir's token shares

If the heir is not registered or the vault does not exist, an error message is shown.

**3. Review inheritance details**

If found, the page displays:

- Vault owner address (truncated)
- Vault state (color-coded: active, grace, claimable, distributed)
- The heir's share percentage
- Calculated Token A and Token B allocations
- Claim status (pending or claimed)

**4. Claim tokens**

The "Claim Inheritance" button is enabled only when:
- The vault state is "claimable" (deadline has passed)
- The heir has not already claimed

Clicking the button sends a `claim` instruction. On success, a transaction link is displayed pointing to the Solana Explorer.

### Guardian Flow

The guardian role is optional and set during vault creation. If configured:

1. The guardian monitors the vault (off-chain -- the protocol does not notify guardians).
2. If the owner misses a heartbeat and the vault enters the grace period, the guardian can call `guardian_pause` to extend the effective deadline by 30 days.
3. This is a one-time action per vault.
4. The guardian pause is only valid during the grace period (after the heartbeat interval expires but before the full deadline passes).

The frontend does not currently expose a dedicated guardian interface. Guardians interact via the on-chain instruction directly or through a future UI addition.

### Emergency Withdraw Flow

1. The vault owner navigates to the dashboard.
2. At the bottom of the page, the "Emergency Withdraw" section displays a warning.
3. The owner clicks the button and confirms via a dialog.
4. The `emergency_withdraw` instruction transfers all Token A and Token B balances from the vault back to the owner's wallet.
5. The vault is marked as distributed (`is_distributed = true`).
6. The owner can create a new vault afterward.

---

## Getting Started

### Prerequisites

- **Rust** (stable toolchain) -- for building the Solana program
- **Solana CLI** (v1.18+) -- for key management and deployments
- **Anchor CLI** (v0.30+) -- for building and testing the program
- **Node.js** (v18+) and **npm** -- for the frontend application
- A Solana wallet (Phantom or Solflare browser extension)

### Building the On-Chain Program

From the project root (`heirloom-app/`):

```bash
# Build the Anchor program
anchor build

# The compiled program will be at:
#   target/deploy/heirloom_app.so
# The generated IDL will be at:
#   target/idl/heirloom_app.json
```

After building, copy the IDL to the frontend:

```bash
cp target/idl/heirloom_app.json heirloom-app/src/lib/idl.json
```

### Running the Frontend

```bash
cd heirloom-app

# Install dependencies
npm install --legacy-peer-deps

# Start the development server
npm run dev
```

The development server starts at `http://localhost:5173` by default.

**Production build:**

```bash
npm run build    # Outputs to heirloom-app/dist/
npm run preview  # Preview the production build locally
```

### Deploying to Devnet

```bash
# Configure Solana CLI for devnet
solana config set --url https://api.devnet.solana.com

# Airdrop SOL to your deployer wallet (if needed)
solana airdrop 2

# Deploy the program
anchor deploy --provider.cluster devnet

# Note the deployed program ID and update:
#   1. Anchor.toml (programs.devnet section)
#   2. heirloom-app/src/config/constants.ts (PROGRAM_ID default)
#   3. programs/heirloom-app/src/lib.rs (declare_id! macro)
```

Create a `.env` file in the `heirloom-app/` directory to point the frontend to devnet:

```bash
VITE_NETWORK=devnet
VITE_RPC_URL=https://api.devnet.solana.com
VITE_PROGRAM_ID=<your-deployed-program-id>
```

---

## Testing

The on-chain program uses Rust-based tests with the `litesvm` crate for local Solana VM simulation:

```bash
# From the project root
cargo test
```

Or via Anchor:

```bash
anchor test
```

---

## Security Considerations

- **PDA authority.** All tokens in the vault are held by ATAs owned by the vault PDA. No private key exists for this address. Only the on-chain program can authorize transfers from the vault, using the PDA signer seeds.

- **One vault per owner.** The PDA derivation scheme (`[b"vault", owner]`) ensures a single vault per owner address. Attempting to create a second vault while one is active will fail with `VaultAlreadyExists`.

- **Basis point validation.** Heir splits must sum to exactly 10,000 basis points (100%). This is enforced on-chain during `create_vault` and `update_heirs`.

- **u128 arithmetic for share calculation.** Token shares are computed using u128 intermediate values to prevent overflow when multiplying large token balances by basis points.

- **Guardian limitations.** The guardian can only pause once and only during the grace period. This prevents abuse while providing a safety mechanism for legitimate cases where the owner is temporarily unable to send a heartbeat.

- **Immutable deadline logic.** The vault state is computed from timestamps and intervals stored on-chain. There is no admin key or upgrade authority that can alter the deadline calculation.

- **Emergency withdraw is irreversible.** Once called, `emergency_withdraw` marks the vault as distributed. This prevents any further deposits, claims, or heartbeats on that vault instance.

- **Client-side state computation.** The frontend computes vault states (active, grace, claimable, distributed) using wall-clock time. The authoritative state check happens on-chain during the `claim` instruction, so a client displaying an incorrect state cannot lead to unauthorized claims.
