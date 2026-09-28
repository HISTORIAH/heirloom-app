# Changelog

Notable changes to the `heirloom` program and its generated clients
(`@historiah/heirloom`, `heirloom-client`). Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

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
