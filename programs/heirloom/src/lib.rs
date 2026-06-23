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

declare_id!("FQiUcHRKJxSuShaRJszEPoRBinubDPoPPD75NvGtPRya");

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "Heirloom Program",
    project_url: "https://heirlm.xyz/",
    contacts: "email:info@heirlm.xyz, twitter:@heirloom_app",
    policy: "https://github.com/HISTORIAH/Heirloom-app",
    preferred_languages: "en",
    source_code: "https://github.com/HISTORIAH/Heirloom-app"
}

declare_program!(lulo_v2);

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

    pub fn deposit_lulo<'info>(
        ctx: Context<'info, DepositLulo<'info>>,
        amount: u64,
        deposit_type: DepositType,
    ) -> Result<()> {
        DepositLulo::deploy_yield_handler(ctx, amount, deposit_type)
    }

    pub fn withdraw_protected_lulo<'info>(
        ctx: Context<'info, WithdrawProtected<'info>>,
        amount: u64,
    ) -> Result<()> {
        WithdrawProtected::withdraw_protected_handler(ctx, amount)
    }

    pub fn init_withdraw_regular_lulo<'info>(
        ctx: Context<'info, InitWithdrawRegular<'info>>,
        withdrawal_id: u16,
        amount: u64,
    ) -> Result<()> {
        InitWithdrawRegular::init_withdraw_regular_handler(ctx, withdrawal_id, amount)
    }

    pub fn complete_withdraw_regular_lulo<'info>(
        ctx: Context<'info, CompleteWithdrawRegular<'info>>,
        withdrawal_id: u16,
    ) -> Result<()> {
        CompleteWithdrawRegular::complete_regular_withdraw_handler(ctx, withdrawal_id)
    }
}
