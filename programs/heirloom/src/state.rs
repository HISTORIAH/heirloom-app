use anchor_lang::prelude::*;

#[account]
pub struct Estate {
    pub authority: Pubkey,

    pub heir: Pubkey,

    pub heartbeat_interval: i64,

    pub grace_period: i64,

    pub last_heartbeat: i64,

    pub created_at: i64,

    pub bump: u8,

    pub is_claimed: bool,

    pub pause_duration: i64,

    pub paused_until: i64,

    pub is_deferred: bool,

    pub delegate: Option<Pubkey>,

    /// hot signer wallet
    pub hb_signer: Option<Pubkey>,

    /// number of vault token accounts (ATAs) still open under this estate
    pub claimable_assets: u8,

    pub label: String,
}

impl Estate {
    pub const SEED: &[u8] = b"estate";

    pub const LEN: usize = 8           // discriminator
    + 32                             // authority
    + 32                             // heir
    + 8                              // heartbeat_interval
    + 8                              // grace period
    + 8                              // last heartbeat
    + 8                              // created at
    + 1                              // bump
    + 1                              // is claimed
    + 8                              // pause duration
    + 8                              // paused until
    + 1                              // is deffered
    + 1 + 32                         // delegate
    + 1 + 32                         // hb signer
    + 1                              // claimable assets
    + 32; // label
}

#[account]
pub struct Vault {
    pub estate: Pubkey,

    pub bump: u8,
}

impl Vault {
    pub const SEED: &[u8] = b"vault";

    pub const LEN: usize = 8           // discriminator
    + 32                             // estate
    + 1; // bump
}
