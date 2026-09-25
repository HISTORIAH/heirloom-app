use anchor_lang::prelude::*;

#[account(borsh)]
#[derive(InitSpace)]
pub struct Estate {
    pub authority: Address,

    pub heir: Address,

    /// Seconds between required check-ins
    pub checkin_interval_secs: i64,

    /// Extra seconds after interval before claimable
    pub grace_period_secs: i64,

    /// Timestamp of last check-in
    pub last_checkin_ts: i64,

    pub created_at: i64,

    pub bump: u8,

    /// Duration of one-time delegate pause in seconds
    pub delegate_pause_duration_secs: i64,

    /// Timestamp when one-time delegate pause expires (0 = never used)
    pub delegate_pause_expires_at: i64,

    /// True while assets are being migrated to new estate
    pub is_migrating: bool,

    pub delegate: Option<Address>,

    /// Optional hot wallet signer for checkins
    pub checkin_signer: Option<Address>,

    /// Number of remaining claimable assets (tokens + 1 for SOL)
    pub claimable_assets: u8,
}

impl Estate {
    pub const SEED: &[u8] = b"estate";

    pub const LEN: usize = 8         // discriminator
    + 32                             // authority
    + 32                             // heir
    + 8                              // checkin_interval_secs
    + 8                              // grace_period_secs
    + 8                              // last_checkin_ts
    + 8                              // created_at
    + 1                              // bump
    + 8                              // delegate_pause_duration_secs
    + 8                              // delegate_pause_expires_at
    + 1                              // is_migrating
    + 1 + 32                         // delegate
    + 1 + 32                         // checkin_signer
    + 1; // claimable_assets
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

#[derive(SchemaWrite, SchemaRead, Debug, PartialEq, Eq, Copy, Clone)]
pub enum DepositType {
    #[wincode(tag = 0)]
    Protected,
    #[wincode(tag = 1)]
    Boosted,
}

#[cfg(feature = "idl-build")]
impl anchor_lang::IdlAccountType for DepositType {
    fn __idl_type_def() -> Option<&'static str> {
        Some(
            r#"{"name":"DepositType","type":{"kind":"enum","variants":[{"name":"Protected"},{"name":"Boosted"}]}}"#,
        )
    }

    fn __register_idl_deps(
        _accounts: &mut ::anchor_lang::__alloc::vec::Vec<&'static str>,
        types: &mut ::anchor_lang::__alloc::vec::Vec<&'static str>,
    ) {
        if let Some(t) = <Self as anchor_lang::IdlAccountType>::__idl_type_def() {
            types.push(t);
        }
    }
}
