# @historiah/heirloom

TypeScript client for the Heirloom digital estate program on Solana.

```bash
bun add @historiah/heirloom
```

Peer dependency: `@solana/kit ^6.1.0`

---

## Quick Start

```ts
import {
  getInitializeInstructionAsync,
  getUpdateFieldInstruction,
  findEstatePda,
  findVaultPda,
} from "@historiah/heirloom";
import { createSolanaRpc, generateKeyPairSigner } from "@solana/kit";

const rpc = createSolanaRpc("https://api.devnet.solana.com");
const authority = await generateKeyPairSigner();
const heir = await generateKeyPairSigner();
```

---

## Lifecycle Flow

### 1. Initialize an Estate

Creates the estate PDA + vault PDA and deposits the first asset (SOL or SPL token).

```ts
const ix = await getInitializeInstructionAsync({
  authority,
  heir: heir.address,
  heartbeatInterval: 30 * 24 * 60 * 60, // 30 days in seconds
  gracePeriod: 7 * 24 * 60 * 60,        // 7 days
  pauseDuration: 3 * 24 * 60 * 60,      // 3 days
  amount: 1_000_000_000n,               // 1 SOL (lamports)
  label: "Main Estate",
});
```

**Key accounts resolved automatically:** `estate`, `vault`, `tokenProgram`, `associatedTokenProgram`, `systemProgram`.

---

### 2. Register More Assets

Deposit additional tokens into an existing estate.

```ts
const ix = await getRegisterAssetInstructionAsync({
  authority,
  heir: heir.address,
  amount: 500_000_000n,
});
```

---

### 3. Heartbeat (Proof of Life)

Refresh the estate's `lastHeartbeat` to reset the claim timer. Use `updateField` with `lastHeartbeat` set to the current timestamp.

```ts
import { getUpdateFieldInstruction } from "@historiah/heirloom";

const ix = getUpdateFieldInstruction({
  authority,
  heir: heirAddress,
  estate: estateAddress,
  heartbeatInterval: null,   // keep current
  gracePeriod: null,         // keep current
  pauseDuration: null,       // keep current
  label: null,               // keep current
});
```

> **Note:** Calling `updateField` with all `null` values performs a heartbeat — the program updates `lastHeartbeat` internally. Any non-null value updates that field.

---

### 4. Claim (Heir)

After `lastHeartbeat + heartbeatInterval + gracePeriod` has passed, the heir can claim all assets.

```ts
const ix = await getClaimInstructionAsync({
  heir: heirSigner,
  authority: authority.address,
});
```

**Key accounts resolved automatically:** `estate`, `vault`, `treasury`, `tokenProgram`, `associatedTokenProgram`, `systemProgram`.

---

### 5. Revoke (Emergency Withdraw)

Before the claim window opens, the authority can revoke assets back to themselves.

```ts
const ix = await getRevokeInstructionAsync({
  authority,
  heir: heir.address,
});
```

---

## Estate Management

Update your estate settings or change the heir.

| Instruction | Purpose | Signer |
|-------------|---------|--------|
| `updateField` | Update heartbeat interval, grace period, pause duration, or estate label | authority |
| `updateHeir` | Migrate all assets to a new heir (creates new estate + vault PDAs) | authority |
| `delegateDefer` | Pause the claim clock (delegate signs) | delegate |

### Update Heir

```ts
const ix = await getUpdateHeirInstructionAsync({
  authority,
  heir: currentHeirAddress,
  newHeir: newHeirAddress,
});
```

**Key accounts resolved automatically:** `estate`, `newEstate`, `vault`, `newVault`, `tokenProgram`, `associatedTokenProgram`, `systemProgram`.

### Delegate Defer

```ts
const ix = await getDelegateDeferInstructionAsync({
  delegate: delegateSigner,
  authority: authority.address,
  heir: heir.address,
});
```

**Key account resolved automatically:** `estate`.

---

## Accounts

| Account | PDA Seeds | Description |
|---------|-----------|-------------|
| `Estate` | `["estate", authority, heir]` | Estate policy: intervals, timestamps, heir, delegate, label |
| `Vault` | `["vault", authority, heir]` | Token account holding vault assets |

Fetch an estate:

```ts
const [estate] = await findEstatePda({ authority: authority.address, heir: heir.address });
const estateAccount = await fetchEstate(rpc, estate);
console.log(estateAccount.lastHeartbeat, estateAccount.isClaimed, estateAccount.claimableAssets);
```

---

## Program Address

```
heird3FWfGcobFHyZEC6FMaPBPN3oWqsh8ZqVQXz5Kz 
```

## License

MIT
