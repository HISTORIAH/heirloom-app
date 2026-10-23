# Changelog

Notable changes to the `heirloom` program and its generated clients
(`@historiah/heirloom`, `heirloom-client`). Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Scheduled payouts. The owner can split the estate into `total_periods` equal payouts,
  `period_secs` apart. The first payout unlocks at open, and missed payouts roll over
  into the next claim. Each payout is an equal share of what's left, so yield and
  rounding dust are absorbed and the final payout takes the rest. `total_periods = 1`
  is the existing lump sum. Payouts before the last one don't close the vault token
  account or `AssetRecord`. SOL payouts never go below the vault's rent and can be
  claimed while tokens remain; only the final SOL payout needs the tokens done first.
- **Breaking:** `initialize` takes `total_periods: u16, period_secs: i64` after `amount`.
  `update_field` takes `total_periods: Option<u16>, period_secs: Option<i64>` after
  `delegate_pause_duration_secs` (owner only).
- **Breaking:** new account fields: `Estate.total_periods`, `Estate.period_secs`,
  `Vault.periods_claimed` and `AssetRecord.periods_claimed`. `Vault` is now a borsh
  account (was zero-copy). `Estate` is now 200 bytes, `Vault` 43 and `AssetRecord` 23.
  Existing estates no longer deserialize and have to be recreated.
- Errors `EstateOpened`, `NothingToClaim` and `InvalidSchedule`.
- `NFT_DEPOSIT_FEE_LAMPORTS` (0.01 SOL), a flat fee for depositing an NFT (a mint with 0
  decimals and a supply of 1). The JS client exports the same constant. Not charged yet:
  `initialize` and `register_asset` need a `treasury` account to collect it, which would
  break clients built before this change.

### Changed

- **Breaking:** `update_field` (check-in) fails with `EstateOpened` once the estate is
  open (`claimable_at`, or the end of a delegate pause if later). So the open time no
  longer moves, and the payout schedule counts from it. `update_heir` can't start a
  migration after open either; a migration started before open can still finish.

### Fixed

- `claim` and `revoke` no longer take the bps fee on NFTs. The fee rounded up to the whole
  token, so the NFT went to the treasury and the heir or authority received nothing.

- **Breaking:** renamed `Estate` fields and instruction arguments. Logic is unchanged.

  | Before | After |
  |---|---|
  | `heartbeat_interval` | `check_in_interval_secs` |
  | `grace_period` | `grace_period_secs` |
  | `last_heartbeat` | `last_check_in_ts` |
  | `pause_duration` | `delegate_pause_duration_secs` |
  | `paused_until` | `delegate_pause_expires_at` |
  | `hb_signer` | `check_in_signer` |

  Generated clients follow the same names in camelCase (e.g. `checkInIntervalSecs`).
- **Breaking:** `Estate` account size is now 189 bytes (was 225).
- Program now builds against the `otter-sec/anchor` `anchor-next` branch (was
  `anchor-lang 2.0.0-rc.1`); `wincode` bumped to 0.6.
- JS client now targets `@solana/kit` ^8.3 and `@solana/program-client-core` ^8.4.
  Account inputs accept any `InstructionAccountInput` (address, PDA, `{ address }` or
  account meta), not only `Address`.
- JS client: every instruction now has an `*InstructionAsync` variant that derives the
  `estate` and `vault` PDAs from `authority` and `heir`. The client methods
  (`client.heirloom.instructions.*`) use these, so they return a `Promise` and must be
  awaited.

### Removed

- **Breaking:** `label` field on `Estate`, and the `label` argument to `initialize` and
  `update_field`. Estate names will be stored off-chain by the backend.
- **Breaking:** `LabelTooLong` error.
