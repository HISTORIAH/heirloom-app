# app-ika

Heirloom's IKA-powered frontend. A Vite + React + TypeScript SPA that lets a Solana-resident user create a cross-chain inheritance vault (currently EVM and Bitcoin), prove liveness with a passkey heartbeat, and let an heir or the original owner trigger a payout signed by an Ika dWallet.

The frontend never speaks raw gRPC, never holds a private key, and never pays gas. It composes BCS payloads and Solana instructions, then hands them to the Heirloom backend, which acts as the relayer and gRPC proxy. The on-chain enforcement (claim windows, heartbeat verification, CPI into Ika) lives in the [heirloom-ika-program](#interaction-with-heirloom-ika-program) Solana program.

## Table of contents

1. [What IKA is in this project](#what-ika-is-in-this-project)
2. [System architecture](#system-architecture)
3. [How IKA integrates with the app](#how-ika-integrates-with-the-app)
4. [Frontend layout](#frontend-layout)
5. [Interaction with heirloom-ika-program](#interaction-with-heirloom-ika-program)
6. [End-to-end flows](#end-to-end-flows)
7. [Configuration](#configuration)
8. [Development](#development)

## What IKA is in this project

Ika is a threshold-MPC network that custodies a "dWallet": a non-Solana keypair (secp256k1, secp256r1, Curve25519, or Ristretto) whose private key is never reconstructed. Signing requires both an off-chain user signature and an on-chain approval. Heirloom uses Ika to give every vault a real Ethereum or Bitcoin address whose authority sits behind a Solana program rather than behind a seed phrase.

The IKA components the app cares about:

- **dWallet account**: a PDA on Solana owned by the Ika dWallet program (`87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY`). It stores the dWallet's public key, curve, and current authority.
- **DWalletCoordinator PDA**: the Ika program's global coordinator. Required as a readonly account on `approve_message`.
- **MessageApproval PDA**: a one-shot on-chain marker, created by the Ika program when a caller approves a message digest for signing. Its existence is the "on-chain approval" half of the threshold signing requirement.
- **Ika gRPC network**: the off-chain MPC network. Talks BCS-serialized request payloads. We never call it from the browser directly. The Heirloom backend proxies signed requests at `POST /v1/ika/submit`.
- **CPI authority PDA**: derived from `["__ika_cpi_authority"]` under the caller program. The dWallet's authority is transferred to this PDA during setup, so only the Heirloom Solana program can approve messages on behalf of the dWallet.

## System architecture

```
+----------------------+    HTTP/JSON    +----------------------+
|   app-ika (browser)  | <-------------> |  Heirloom backend    |
|  React + @solana/kit |                 |  (Rust relayer)      |
+----------------------+                 +----------+-----------+
   |  passkey (WebAuthn)                            |
   |  MetaMask personal_sign                        |
   v                                                |
                                                    | Solana RPC
                                                    | + Ika gRPC
                                                    v
+--------------------------------------------------------------+
|  Solana                                                       |
|   - heirloom-ika-program (our program)                        |
|       - Estate PDA                                            |
|       - CPI authority PDA                                     |
|   - Ika dWallet program                                       |
|       - dWallet PDA                                           |
|       - DWalletCoordinator PDA                                |
|       - MessageApproval PDA (created per signing approval)    |
+--------------------------------------------------------------+
```

The backend is the only component that holds funds (a Solana fee-payer keypair) and is the only component that talks gRPC. The browser only signs WebAuthn assertions and MetaMask EIP-191 messages, and renders state.

## How IKA integrates with the app

There are three pieces of IKA work the browser participates in:

### 1. dWallet creation (DKG)

Performed end-to-end by the backend on `POST /v1/ika/create-vault`. The backend runs DKG against the Ika gRPC network, gets back the dWallet's public key and PDA, transfers the dWallet's authority to the Heirloom CPI authority PDA, and then calls `initialize` on `heirloom-ika-program` to register the estate. The browser only supplies policy inputs (heir, label, heartbeat interval, passkey pubkey).

The browser still needs a local model of Ika to derive addresses and PDAs for display and for later message construction. That code lives in `src/services/ika/`:

- `constants.ts`: instruction discriminators (`IX_APPROVE_MESSAGE=8`, `IX_TRANSFER_OWNERSHIP=24`), account-data discriminators, and PDA seeds (`SEED_DWALLET`, `SEED_DWALLET_COORDINATOR`, `SEED_MESSAGE_APPROVAL`, `CPI_AUTHORITY_SEED`).
- `pda.ts`: deterministic derivation of the dWallet PDA, MessageApproval PDA, CPI authority PDA, and coordinator PDA. Mirrors the Rust derivation exactly: the dWallet seed payload is `curve (u16 LE) || public_key`, chunked into 32-byte segments per Solana's `MAX_SEED_LEN`.
- `bcs.ts`: full mirror of `ika-dwallet-types` BCS schemas (`DWalletRequest`, `SignedRequestData`, `UserSignature`, etc.). Used if a signed-request payload ever needs to be assembled in the browser.
- `transport.ts`: thin HTTP client that POSTs hex-encoded `(user_signature, signed_request_data)` pairs at the backend's `/submit` route.

### 2. Heartbeat (proof of life)

The dWallet stays in the "owner controls funds" state as long as the estate's `last_heartbeat` is recent. The browser proves liveness with a WebAuthn assertion over a backend-issued challenge:

1. `GET /v1/ika/heartbeat/:estate_id` returns a base64url 32-byte challenge.
2. `signHeartbeat()` in `src/services/passkey.ts` calls `navigator.credentials.get()` with `userVerification: "required"`, converts the DER signature to raw r||s (64 bytes), and returns the signature plus `authenticatorData` and `clientDataJSON`.
3. `POST /v1/ika/heartbeat` sends those three fields. The backend assembles a Solana transaction containing the `Secp256r1SigVerify` precompile instruction followed by `heirloom_ika_program::heartbeat`. The program reads the precompile output from the Instructions sysvar and asserts the verified pubkey equals `estate.passkey_pubkey`.

No Ika network call is involved in heartbeats: it is purely a Solana state update guarded by SIMD-0075.

### 3. Claim / withdraw (threshold signing)

When the heir (after the claim window opens) or the owner (during the revoke window) wants to move funds out:

1. The frontend calls `getClaimTx` / `getWithdrawTx`. The backend builds the target EVM transaction, returns the keccak256 hash of the unsigned tx, the dWallet's EVM address, and amount.
2. The user signs the hash with MetaMask via `personal_sign` (EIP-191 prefix applied by the wallet).
3. The frontend POSTs the EIP-191 signature plus the destination back to `/claim` or `/withdraw`. The backend:
   - Builds the Solana transaction with two instructions: `Secp256k1SigVerify` precompile (binds the signature to the heir's or owner's address) and `heirloom_ika_program::claim` (or `revoke`), which CPIs into Ika's `approve_message`.
   - Submits to Solana. The CPI creates a MessageApproval PDA at `["dwallet", curve_bytes, pk_chunks..., "message_approval", sig_scheme_bytes, message_hash]`.
   - Submits the BCS `Sign` request to the Ika gRPC network with `ApprovalProof::Solana { transaction_signature, slot }`. The MPC network verifies the proof against the just-created MessageApproval PDA and returns the secp256k1 signature.
   - Broadcasts the signed EVM transaction.

The single threshold-signing operation the browser is even indirectly responsible for is producing a `message_hash` that the Solana program will approve. The actual MPC signing is the backend's job; the frontend just needs the hash to match what the backend will send to Ika.

## Frontend layout

```
src/
  App.tsx                routes: /, /create, /claim, /withdraw
  pages/
    Dashboard.tsx        list of locally-stored vaults, heartbeat trigger
    CreateVault.tsx      4-step wizard: heartbeat policy, owner, heir, review
    Claim.tsx            heir-side payout flow (MetaMask sign + relay)
    Withdraw.tsx         owner-side emergency exit
  services/
    api.ts               typed wrapper around /v1/ika/* endpoints
    heirloom-backend.ts  generic Solana transaction relay client
    passkey.ts           WebAuthn register + sign, P-256 SPKI/CBOR parsing
    dwallet.ts           pubkey -> EVM/BTC address derivation
    ika/                 IKA-specific types, PDAs, BCS, transport
  config/constants.ts    network, program IDs, supported chains
  types/index.ts         ChainId, DWalletInfo, IkaGrpcTransport
  lib/                   bs58, classnames helpers
  components/            ErrorBoundary
```

Vaults are tracked client-side in `localStorage` under the key `heirloom_vaults`. There is no auth on the backend's read endpoints; the estate ID is the lookup key.

## Interaction with heirloom-ika-program

`heirloom-ika-program` is the Solana program at `GmUKHL8q1htYdKHT5YQho8zA6hdqqo8QNqfnTHyWzpwa` (declared in `heirloom-ika-program/src/lib.rs`). It is built with [Quasar](https://github.com/blueshift-gg/quasar), a no_std Solana framework. It exposes four instructions and owns one account type.

### Estate account

Defined in `heirloom-ika-program/src/state.rs`. PDA seeds: `[b"ika_estate", estate_id]`. Stores:

- `estate_id`, `dwallet_pda`, `public_key (33)`, `public_key_len`, `curve`, `signature_scheme`
- `heartbeat_interval`, `grace_period`, `pause_duration`, `last_heartbeat`, `paused_until`, `created_at`
- `is_claimed`, `is_deferred`, `heartbeat_nonce`
- `passkey_pubkey (33 bytes, compressed P-256)`
- `heir_address`, `owner_address` (target-chain addresses, hex for EVM, bech32 for BTC), `label`

The frontend never writes Estate directly. It treats Estate as the source of truth for vault state read by the backend.

### Instructions

All four use a Quasar discriminator (single byte) and are invoked exclusively by the relayer wallet. The user never holds SOL.

| Disc. | Instruction | Caller from frontend | What it does |
|-------|-------------|----------------------|--------------|
| `0`   | `initialize` | `POST /v1/ika/create-vault` | Validates inputs, derives Estate PDA, stores the policy. Assumes DKG already completed and dWallet authority already transferred. |
| `1`   | `heartbeat`  | `POST /v1/ika/heartbeat`    | Verifies SIMD-0075 `Secp256r1SigVerify` at ix[0], pubkey must equal `estate.passkey_pubkey`. Bumps `last_heartbeat` and `heartbeat_nonce`, clears `is_deferred` and `paused_until`. |
| `2`   | `claim`      | `POST /v1/ika/claim`        | Asserts `now >= last_heartbeat + heartbeat_interval + grace_period`. Verifies `Secp256k1SigVerify` at ix[0] and recovered address equals `estate.heir_address`. CPIs `approve_message` on the Ika program. Sets `is_claimed = true`. |
| `3`   | `revoke`     | `POST /v1/ika/withdraw`     | Same shape as claim but enforces the inverse window (`now < claim window`). Verifies recovered address equals `estate.owner_address`. |

### Required account set (claim and revoke)

The browser does not assemble these accounts directly, but they are the contract the backend must satisfy and they describe what each network round-trip is for:

```
relayer (signer, mut)
estate (PDA, mut)
coordinator (Ika DWalletCoordinator PDA)
message_approval (PDA, mut, created by Ika)
dwallet (must equal estate.dwallet_pda)
caller_program (heirloom-ika-program ID)
cpi_authority (our PDA: ["__ika_cpi_authority"])
ika_program (87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY)
system_program
clock sysvar
instructions sysvar
```

`message_approval` is allocated by Ika during the CPI. Its address is derived in `src/services/ika/pda.ts` so the frontend can show the heir a deterministic preview, but the actual creation is on-chain.

### CPI to Ika

`heirloom-ika-program/src/ika_cpi.rs` carries an inline copy of Quasar's Ika CPI SDK. `claim` and `revoke` both build a `DWalletContext` and call `approve_message`. The instruction data laid down on the wire is 100 bytes:

```
[disc=8, bump, message_digest(32), message_metadata_digest(32), user_pubkey(32), signature_scheme(2 LE)]
```

`user_pubkey` is `estate.public_key[1..33]` for 33-byte compressed keys, or `[0..32]` for 32-byte keys (eddsa). `message_metadata_digest` is all zeros for now: message binding is enforced solely by `message_digest`.

The Ika program verifies the caller (must be the registered `caller_program`), verifies the `cpi_authority` signature on the dWallet, and creates the MessageApproval PDA at:

```
[b"dwallet", curve_u16_le, public_key_chunks_of_32..., b"message_approval", sig_scheme_u16_le, message_hash]
```

That PDA is then the on-chain half of the approval proof the Ika gRPC network requires before producing the threshold signature.

### Error surface

`HeirloomIkaError` (in `errors.rs`) is what the frontend will see on revert:

- `InvalidDWalletPda`, `InvalidPublicKey`, `InvalidCurve`, `InvalidSignatureScheme`, `InvalidHeirAddress`
- `EstateAlreadyClaimed`, `NotYetClaimable`, `EstatePaused`, `HeartbeatTooSoon`
- `InvalidTxPayload` (precompile or sysvar shape mismatch), `Unauthorized` (recovered address or passkey mismatch)
- `InvalidProgram`, `InvalidCoordinator`, `InvalidCpiAuthority`, `DWalletNotOwnedByIka`
- `MathOverflow`

The backend surfaces these as plain-text error bodies. The frontend renders them verbatim under the relevant action.

### Build target

The program is built with Quasar via Cargo (see `heirloom-ika-program/Quasar.toml` and `Cargo.toml`). Program ID is hard-coded in `lib.rs` via `declare_id!`. The frontend reads it from `VITE_HEIRLOOM_IKA_PROGRAM_ID` (so devnet vs mainnet rebuilds do not require frontend code changes).

## End-to-end flows

### Create vault

1. User completes the 4-step wizard in `CreateVault.tsx`.
2. `registerPasskey(userId)` triggers WebAuthn, extracts the compressed P-256 pubkey (33 bytes hex) either from `getPublicKey()` SPKI or by walking the CBOR attestation object.
3. `createVault(...)` POSTs `{ heir_eth_address, owner_address, passkey_pubkey_hex, network_id, heartbeat_interval_secs, grace_period_secs, pause_duration_secs, label }`.
4. Backend runs DKG, transfers dWallet authority to our CPI authority, and submits `initialize`. Returns `{ estate_id, estate_pda, eth_deposit_address, dwallet_solana_address }`.
5. Frontend stores the vault in `localStorage` and shows the deposit address as a QR.

### Heartbeat

1. Dashboard calls `getHeartbeatChallenge(estateId)`.
2. `signHeartbeat(challenge_b64, credentialId)` produces `(signature_b64, authenticator_data_b64, client_data_json)`.
3. `postHeartbeat(...)` returns the Solana transaction signature once `heirloom_ika_program::heartbeat` has landed.

### Claim (heir)

1. Heir lands on `/claim?estate=<id>`. `getClaimTx(estateId)` returns the message hash, source address, and amount.
2. `signMessageHash(hash, heir_eth_address)` calls MetaMask `personal_sign`.
3. `postClaim(...)` returns `{ solana_tx, eth_tx }`. By the time this returns, MessageApproval is created, Ika has produced the signature, and the EVM transaction has been broadcast.

### Withdraw (owner emergency exit)

Same as claim, but uses `getWithdrawTx` / `postWithdraw`, must occur before the claim window opens, and binds to `owner_address` rather than `heir_address`.

## Configuration

Environment variables (Vite, read at build time):

| Var | Default | Meaning |
|-----|---------|---------|
| `VITE_NETWORK`                 | `devnet`                          | UI label only |
| `VITE_BACKEND_URL`             | `http://localhost:3040`           | Heirloom backend base URL |
| `VITE_IKA_GRPC_URL`            | `https://api.heirloom.xyz/v1/ika` | Backend's Ika proxy base |
| `VITE_IKA_DWALLET_PROGRAM_ID`  | required                          | Ika dWallet program (mainnet: `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY`) |
| `VITE_HEIRLOOM_IKA_PROGRAM_ID` | required                          | Our program (`GmUKHL8q1htYdKHT5YQho8zA6hdqqo8QNqfnTHyWzpwa`) |

WebAuthn requires a secure context. Use `localhost`, not a LAN IP, during local development. See the diagnostic hints in `src/services/passkey.ts` for the most common failure modes.

## Development

```
pnpm install
pnpm --filter app-ika dev      # vite dev server
pnpm --filter app-ika build    # tsc -b && vite build
pnpm --filter app-ika lint
```

The app depends on a running Heirloom backend at `VITE_BACKEND_URL` for every non-trivial action. On a fresh `pnpm dev`, hit `/v1/ika/health` first via the backend's CLI or curl to confirm both the relayer wallet and the Ika gRPC connection are up.

For changes to the on-chain program, rebuild and redeploy `heirloom-ika-program` (see its own Quasar config), then update `VITE_HEIRLOOM_IKA_PROGRAM_ID` if the program ID changes. Estate accounts created under an older program ID are not migratable: a program-ID change is a hard fork of vault state.
