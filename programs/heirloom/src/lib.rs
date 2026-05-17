pub mod constants;
pub mod error;
pub mod helpers;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use solana_security_txt::security_txt;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("5TzknZ8BQbiPzHD3XXFm7GR3VQUSe22CtQTnceePCATV");

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "Heirloom Program",
    project_url: "https://heirlm.xyz/",
    contacts: "email:info@heirlm.xyz, twitter:@heirloom_app",
    policy: "https://github.com/HISTORIAH/Heirloom-app",
    preferred_languages: "en",
    source_code: "https://github.com/HISTORIAH/Heirloom-app"
}

#[program]
pub mod heirloom {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        heartbeat_interval: i64,
        grace_period: i64,
        pause_duration: i64,
        amount: u64,
        label: String,
    ) -> Result<()> {
        Initialize::initialize_handler(
            ctx,
            heartbeat_interval,
            grace_period,
            pause_duration,
            amount,
            label,
        )
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        Claim::claim_handler(ctx)
    }

    pub fn delegate_defer(ctx: Context<DelegateDefer>) -> Result<()> {
        DelegateDefer::delegate_defer_handler(ctx)
    }

    pub fn register_asset(ctx: Context<RegisterAsset>, amount: u64) -> Result<()> {
        RegisterAsset::register_asset_handler(ctx, amount)
    }

    pub fn revoke(ctx: Context<Revoke>) -> Result<()> {
        Revoke::revoke_handler(ctx)
    }

    pub fn update_field(
        ctx: Context<UpdateField>,
        heartbeat_interval: Option<i64>,
        grace_period: Option<i64>,
        pause_duration: Option<i64>,
        label: Option<String>,
    ) -> Result<()> {
        UpdateField::update_fields_handler(
            ctx,
            heartbeat_interval,
            grace_period,
            pause_duration,
            label,
        )
    }

    pub fn update_heir(ctx: Context<UpdateHeir>) -> Result<()> {
        UpdateHeir::update_heir_handler(ctx)
    }
}
