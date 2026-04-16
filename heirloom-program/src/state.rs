use quasar_lang::prelude::*;

#[account(discriminator = 1, set_inner)]
#[seeds(b"estate", authority: Address, heir: Address)]
pub struct Estate {
    pub authority: Address,

    pub heir: Address,

    pub heartbeat_interval: i64,

    pub grace_period: i64,

    pub last_heartbeat: i64,

    pub created_at: i64,

    pub bump: u8,

    pub is_claimed: bool,

    pub pause_duration: i64,

    pub paused_until: i64,

    pub is_deferred: bool,

    pub delegate: Option<Address>,

    /// number of vault token accounts (ATAs) still open under this estate
    pub claimable_assets: u8,

    pub label: String<32>, // FIXME: SET THIS AS A CONST
                           // read allocated amount from vault balance
}

#[account(discriminator = 2, set_inner)]
#[seeds(b"vault", authority: Address, heir: Address)]
pub struct Vault {
    pub estate: Address,

    pub bump: u8,
}
