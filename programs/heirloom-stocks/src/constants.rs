use anchor_lang::{address, prelude::*};

/// Taken from the gross amount when a plan fires, in either mode.
pub const RECOVERY_FEE_BPS: u16 = 75;

/// Taken when the owner pulls assets back out of a vault plan themselves.
pub const EXIT_FEE_BPS: u16 = 50;

pub const MAX_INTERVAL_SECONDS: i64 = 31_536_000; // 365 days

pub const BPS_DENOMINATOR: u16 = 10_000;

// TEMP! shared with the inheritance program for testing
pub const TREASURY: Address = address!("tr31o8FF9v2rEukh84ZwjRQgYa3x74PHssighePMP1Q");

/// Permitted to curate the issuer registry. Cannot touch user plans or assets.
pub const ADMIN: Address = address!("tr31o8FF9v2rEukh84ZwjRQgYa3x74PHssighePMP1Q");

/// Token-2022 `AccountState::Frozen`, as stored in `DefaultAccountState.state`.
///
/// Superstate's Opening Bell mints are frozen-by-default and thaw only for
/// allowlisted holders, so a plan-owned account for them would be born unusable.
pub const ACCOUNT_STATE_FROZEN: u8 = 2;
