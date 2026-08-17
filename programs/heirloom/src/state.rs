use anchor_lang::prelude::*;

#[account(borsh)]
#[derive(InitSpace)]
pub struct Estate {
    pub authority: Address,

    pub heir: Address,

    pub heartbeat_interval: i64,

    pub grace_period: i64,

    pub last_heartbeat: i64,

    pub created_at: i64,

    pub bump: u8,

    pub pause_duration: i64,

    pub paused_until: i64,

    pub is_migrating: bool,

    pub delegate: Option<Address>,

    /// hot signer wallet
    pub hb_signer: Option<Address>,

    /// number of vault token accounts (ATAs) still open under this estate
    pub claimable_assets: u8,

    #[max_len(32)]
    pub label: String,
}

impl Estate {
    pub const SEED: &[u8] = b"estate";

    pub const LEN: usize = 8         // discriminator
    + 32                             // authority
    + 32                             // heir
    + 8                              // heartbeat_interval
    + 8                              // grace period
    + 8                              // last heartbeat
    + 8                              // created at
    + 1                              // bump
    + 8                              // pause duration
    + 8                              // paused until
    + 1                              // is migrating
    + 1 + 32                         // delegate
    + 1 + 32                         // hb signer
    + 1                              // claimable assets
    + 4 + 32; // label
}

#[account]
pub struct Vault {
    pub estate: Address,

    pub bump: u8,
}

impl Vault {
    pub const SEED: &[u8] = b"vault";

    pub const LEN: usize = 8           // discriminator
    + 32                             // estate
    + 1; // bump
}

/// Marker PDA proving a given mint was registered as a claimable asset for
/// an estate. Its existence (not the vault ATA's) is the source of truth,
/// since ATA creation is permissionless and can't be used as a registration
/// check without allowing front-running / double counting.
#[account(borsh)]
#[derive(InitSpace)]
pub struct AssetRecord {
    pub bump: u8,

    pub principal_deployed: u64,

    /// ground truth for close-safety, refreshed from the actual Lulo LP
    /// balance after each withdrawal
    pub has_protected_exposure: bool,

    pub has_boosted_exposure: bool,

    /// count of in-flight `init_withdraw_regular_lulo` requests not yet completed
    pub pending_boosted_withdrawals: u16,
}

impl AssetRecord {
    pub const SEED: &[u8] = b"asset";

    pub const LEN: usize = 8 // discriminator
    + 1 // bump
    + 8 // principal deployed
    + 1 // has_protected_exposure
    + 1 // has_boosted_exposure
    + 2; // pending_boosted_withdrawals
}

#[derive(SchemaWrite, SchemaRead, IdlType, Debug, PartialEq, Eq, Copy, Clone)]
pub enum DepositType {
    #[wincode(tag = 0)]
    Protected,
    #[wincode(tag = 1)]
    Boosted,
}
