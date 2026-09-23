//! Backup and inheritance for tokenized equities.
//!
//! Two coverage models share one plan account:
//!
//! - **Backup** (`PLAN_MODE_BACKUP`) is non-custodial. The stock stays in the
//!   owner's wallet and the plan PDA holds an SPL delegate allowance over it, so
//!   the position remains tradeable and usable as collateral. If the owner stops
//!   checking in, their nominated recovery wallet moves the assets to itself
//!   without needing the lost key.
//! - **Vault** (`PLAN_MODE_VAULT`) is custodial, for inheritance. Assets sit in
//!   token accounts owned by the plan PDA, which gives up liquidity but is immune
//!   to the delegate being displaced.
//!
//! Tokenized equities need handling ordinary SPL tokens do not, and three
//! properties drive most of the design:
//!
//! - Issuers pay dividends and apply splits by moving a `ScaledUiAmount`
//!   multiplier, which never changes raw balances. All amounts here are raw, and
//!   allocations are proportional so a bequest does not drift as dividends accrue.
//! - Issuers retain real power over live positions: a permanent delegate can move
//!   tokens with no plan signature, a freeze authority can freeze an account, and a
//!   pause flag can halt transfers outright. Guards re-check these at payout time
//!   rather than trusting what was true when the asset was covered.
//! - Major mints allocate the transfer-hook extension slot but leave it unset,
//!   keeping an authority that can point it at a program later. This program fails
//!   closed on a live hook instead of transferring incorrectly.

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

declare_id!("8ZwqSnyXupsKsFqseEP62P9pw6hmvaBRu52PeYGo21mm");

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "Heirloom Stocks Program",
    project_url: "https://stocks.heirlm.xyz/",
    contacts: "email:info@heirlm.xyz, twitter:@heirloom_app",
    policy: "https://github.com/HISTORIAH/Heirloom-app",
    preferred_languages: "en",
    source_code: "https://github.com/HISTORIAH/Heirloom-app"
}

#[program]
pub mod heirloom_stocks {
    use super::*;

    // ------------------------------------------------------------- issuer curation

    pub fn register_issuer(
        ctx: &mut Context<RegisterIssuer>,
        label: String,
        risk_tier: u8,
    ) -> Result<()> {
        RegisterIssuer::register_issuer_handler(ctx, label, risk_tier)
    }

    pub fn update_issuer(
        ctx: &mut Context<UpdateIssuer>,
        enabled: Option<bool>,
        risk_tier: Option<u8>,
    ) -> Result<()> {
        UpdateIssuer::update_issuer_handler(ctx, enabled, risk_tier)
    }

    // ------------------------------------------------------------- plan lifecycle

    pub fn initialize_backup_plan(
        ctx: &mut Context<InitializeBackupPlan>,
        checkin_interval_secs: i64,
        grace_period_secs: i64,
        pause_duration_secs: i64,
    ) -> Result<()> {
        InitializeBackupPlan::initialize_backup_plan_handler(
            ctx,
            checkin_interval_secs,
            grace_period_secs,
            pause_duration_secs,
        )
    }

    pub fn initialize_vault_plan(
        ctx: &mut Context<InitializeVaultPlan>,
        checkin_interval_secs: i64,
        grace_period_secs: i64,
        pause_duration_secs: i64,
    ) -> Result<()> {
        InitializeVaultPlan::initialize_vault_plan_handler(
            ctx,
            checkin_interval_secs,
            grace_period_secs,
            pause_duration_secs,
        )
    }

    /// Proof of life. Carries no settings, so a hot `checkin_signer` can never
    /// become a path to editing the plan.
    pub fn check_in(ctx: &mut Context<CheckIn>) -> Result<()> {
        CheckIn::check_in_handler(ctx)
    }

    pub fn update_plan(
        ctx: &mut Context<UpdatePlan>,
        checkin_interval_secs: Option<i64>,
        grace_period_secs: Option<i64>,
        pause_duration_secs: Option<i64>,
        clear_checkin_signer: bool,
        clear_guardian: bool,
    ) -> Result<()> {
        UpdatePlan::update_plan_handler(
            ctx,
            checkin_interval_secs,
            grace_period_secs,
            pause_duration_secs,
            clear_checkin_signer,
            clear_guardian,
        )
    }

    pub fn guardian_defer(ctx: &mut Context<GuardianDefer>) -> Result<()> {
        GuardianDefer::guardian_defer_handler(ctx)
    }

    pub fn close_plan(ctx: &mut Context<ClosePlan>) -> Result<()> {
        ClosePlan::close_plan_handler(ctx)
    }

    // ------------------------------------------------------------- backup mode

    pub fn cover_asset(ctx: &mut Context<CoverAsset>, allocation_bps: u16) -> Result<()> {
        CoverAsset::cover_asset_handler(ctx, allocation_bps)
    }

    pub fn uncover_asset(ctx: &mut Context<UncoverAsset>) -> Result<()> {
        UncoverAsset::uncover_asset_handler(ctx)
    }

    pub fn recover(ctx: &mut Context<Recover>) -> Result<()> {
        Recover::recover_handler(ctx)
    }

    // ------------------------------------------------------------- vault mode

    pub fn vault_add_asset(ctx: &mut Context<VaultAddAsset>, amount: u64) -> Result<()> {
        VaultAddAsset::vault_add_asset_handler(ctx, amount)
    }

    pub fn vault_deposit(ctx: &mut Context<VaultDeposit>, amount: u64) -> Result<()> {
        VaultDeposit::vault_deposit_handler(ctx, amount)
    }

    pub fn vault_withdraw(ctx: &mut Context<VaultWithdraw>, amount: u64) -> Result<()> {
        VaultWithdraw::vault_withdraw_handler(ctx, amount)
    }

    pub fn vault_claim(ctx: &mut Context<VaultClaim>) -> Result<()> {
        VaultClaim::vault_claim_handler(ctx)
    }
}
