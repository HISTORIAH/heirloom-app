use anchor_lang::prelude::*;

use crate::{error::HeirloomError, MAX_INTERVAL_SECONDS};

#[account(borsh)]
pub struct Estate {
    pub authority: Address,

    pub heir: Address,

    /// Seconds between required check-ins
    pub check_in_interval_secs: i64,

    /// Extra seconds after interval before claimable
    pub grace_period_secs: i64,

    /// Timestamp of last check-in
    pub last_check_in_ts: i64,

    pub created_at: i64,

    pub bump: u8,

    /// Duration of one-time delegate pause in seconds
    pub delegate_pause_duration_secs: i64,

    /// Timestamp when one-time delegate pause expires (0 = never used)
    pub delegate_pause_expires_at: i64,

    /// True while assets are being migrated to new estate
    pub is_migrating: bool,

    pub delegate: Option<Address>,

    /// Optional hot wallet signer for check_ins
    pub check_in_signer: Option<Address>,

    /// Number of remaining claimable assets (tokens + 1 for SOL)
    pub claimable_assets: u16,

    /// Number of equal payouts (1 = lump sum)
    pub total_periods: u16,

    /// Seconds between payouts (ignored when total_periods == 1)
    pub period_secs: i64,
}

impl Estate {
    pub const SEED: &[u8] = b"estate";

    pub const LEN: usize = 8         // discriminator
    + 32                             // authority
    + 32                             // heir
    + 8                              // check_in_interval_secs
    + 8                              // grace_period_secs
    + 8                              // last_check_in_ts
    + 8                              // created_at
    + 1                              // bump
    + 8                              // delegate_pause_duration_secs
    + 8                              // delegate_pause_expires_at
    + 1                              // is_migrating
    + 1 + 32                         // delegate
    + 1 + 32                         // check_in_signer
    + 2                              // claimable_assets
    + 2                              // total_periods
    + 8; // period_secs

    /// Ensures an interval argument is non-negative and does not exceed the
    /// max allowed duration.
    pub fn validate_interval_secs(value: i64) -> Result<()> {
        require!(value >= 0, HeirloomError::IntervalNegative);
        require!(
            value <= MAX_INTERVAL_SECONDS,
            HeirloomError::IntervalTooLong
        );
        Ok(())
    }

    /// Ensures a payout schedule has at least one payout, and a positive
    /// interval when there is more than one.
    pub fn validate_schedule(total_periods: u16, period_secs: i64) -> Result<()> {
        require!(total_periods >= 1, HeirloomError::InvalidSchedule);
        if total_periods > 1 {
            require!(period_secs > 0, HeirloomError::InvalidSchedule);
            Estate::validate_interval_secs(period_secs)?;
        }
        Ok(())
    }

    /// Check-in deadline plus grace period.
    pub fn claimable_at(&self) -> Result<i64> {
        let claimable_at = self
            .last_check_in_ts
            .checked_add(self.check_in_interval_secs)
            .and_then(|t| t.checked_add(self.grace_period_secs))
            .ok_or(ProgramError::ArithmeticOverflow)?;
        Ok(claimable_at)
    }

    /// When the heir can start claiming: `claimable_at`, or later if a
    /// delegate pause runs past it. Fixed once reached, since check-ins and
    /// heir changes are blocked from then on.
    pub fn opens_at(&self) -> Result<i64> {
        Ok(self.claimable_at()?.max(self.delegate_pause_expires_at))
    }

    /// Payouts unlocked by `now`, counting the first one at open. 0 before
    /// open.
    pub fn periods_due(&self, now: i64) -> Result<u16> {
        let opens_at = self.opens_at()?;
        if now < opens_at {
            return Ok(0);
        }
        if self.total_periods == 1 {
            return Ok(1);
        }

        let unlocked = (now - opens_at) / self.period_secs + 1;

        Ok(unlocked.min(self.total_periods as i64) as u16)
    }
}

#[account(borsh)]
pub struct Vault {
    pub estate: Address,

    pub bump: u8,

    /// SOL payouts already taken.
    pub periods_claimed: u16,
}

impl Vault {
    pub const SEED: &[u8] = b"vault";

    pub const LEN: usize = 8           // discriminator
    + 32                             // estate
    + 1                              // bump
    + 2; // periods_claimed

    /// Owned copies of the seeds the vault PDA signs with. Copying the
    /// addresses means no account stays borrowed while CPI handles are taken.
    pub fn signer_seeds_for(authority: &Address, heir: &Address, bump: u8) -> VaultSignerSeeds {
        VaultSignerSeeds {
            authority: *authority.as_array(),
            heir: *heir.as_array(),
            bump: [bump],
        }
    }
}

pub struct VaultSignerSeeds {
    authority: [u8; 32],
    heir: [u8; 32],
    bump: [u8; 1],
}

impl VaultSignerSeeds {
    pub fn as_seeds(&self) -> [&[u8]; 4] {
        [Vault::SEED, &self.authority, &self.heir, &self.bump]
    }
}

/// Marker PDA proving a given mint was registered as a claimable asset for
/// an estate. Its existence (not the vault ATA's) is the source of truth,
/// since ATA creation is permissionless and can't be used as a registration
/// check without allowing front-running / double counting.
#[account(borsh)]
pub struct AssetRecord {
    pub bump: u8,

    pub principal_deployed: u64,

    /// ground truth for close-safety, refreshed from the actual Lulo LP
    /// balance after each withdrawal
    pub has_protected_exposure: bool,

    pub has_boosted_exposure: bool,

    /// count of in-flight `init_withdraw_regular_lulo` requests not yet completed
    pub pending_boosted_withdrawals: u16,

    /// Payouts already taken for this mint
    pub periods_claimed: u16,
}

impl AssetRecord {
    pub const SEED: &[u8] = b"asset";

    pub const LEN: usize = 8 // discriminator
    + 1 // bump
    + 8 // principal deployed
    + 1 // has_protected_exposure
    + 1 // has_boosted_exposure
    + 2 // pending_boosted_withdrawals
    + 2; // periods_claimed
}

#[derive(SchemaWrite, SchemaRead, IdlType, Debug, PartialEq, Eq, Copy, Clone)]
pub enum DepositType {
    #[wincode(tag = 0)]
    Protected,
    #[wincode(tag = 1)]
    Boosted,
}
