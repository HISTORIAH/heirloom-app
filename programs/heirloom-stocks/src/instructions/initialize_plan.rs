use anchor_lang::prelude::*;

use crate::{
    error::StocksError,
    helpers::validate_interval,
    state::{ACCOUNT_VERSION, PLAN_MODE_BACKUP, PLAN_MODE_VAULT},
    StockPlan,
};

/// Shared field initialisation for both plan modes.
///
/// `mode` is fixed by the calling instruction rather than passed in, so it is
/// always consistent with the seed the plan was derived from.
#[allow(clippy::too_many_arguments)]
fn init_plan_fields(
    plan: &mut BorshAccount<StockPlan>,
    owner: &Address,
    destination: &Address,
    mode: u8,
    checkin_interval_secs: i64,
    grace_period_secs: i64,
    pause_duration_secs: i64,
    checkin_signer: Option<Address>,
    guardian: Option<Address>,
    bump: u8,
) -> Result<()> {
    require_keys_neq!(*destination, *owner, StocksError::DestinationIsOwner);

    validate_interval(checkin_interval_secs)?;
    validate_interval(grace_period_secs)?;
    validate_interval(pause_duration_secs)?;

    let now = Clock::get()?.unix_timestamp;

    plan.version = ACCOUNT_VERSION;
    plan.owner = *owner;
    plan.destination = *destination;
    plan.mode = mode;
    plan.checkin_interval_secs = checkin_interval_secs;
    plan.grace_period_secs = grace_period_secs;
    plan.last_checkin_ts = now;
    plan.created_at = now;
    plan.pause_duration_secs = pause_duration_secs;
    plan.paused_until = 0;
    plan.checkin_signer = checkin_signer;
    plan.guardian = guardian;
    plan.covered_assets = 0;
    plan.bump = bump;

    Ok(())
}

/// Opens a non-custodial backup plan.
///
/// Nothing moves here and nothing is escrowed. The plan only becomes able to act
/// once the owner covers individual assets, which grants it delegate rights on
/// those token accounts while leaving the tokens in the owner's wallet.
#[derive(Accounts)]
pub struct InitializeBackupPlan {
    #[account(mut)]
    pub owner: Signer,

    /// CHECK: recovery wallet pubkey, stored on the plan.
    pub destination: UncheckedAccount,

    /// CHECK: optional hot wallet allowed to check in only.
    pub checkin_signer: Option<UncheckedAccount>,

    /// CHECK: optional guardian allowed to defer only.
    pub guardian: Option<UncheckedAccount>,

    #[account(
        init,
        payer = owner,
        space = StockPlan::LEN,
        seeds = [StockPlan::SEED, owner.address().as_ref(), &[PLAN_MODE_BACKUP]],
        bump,
    )]
    pub plan: BorshAccount<StockPlan>,

    pub system_program: Program<System>,
}

impl InitializeBackupPlan {
    pub fn initialize_backup_plan_handler(
        ctx: &mut Context<InitializeBackupPlan>,
        checkin_interval_secs: i64,
        grace_period_secs: i64,
        pause_duration_secs: i64,
    ) -> Result<()> {
        let owner = *ctx.accounts.owner.address();
        let destination = *ctx.accounts.destination.address();
        let checkin_signer = ctx.accounts.checkin_signer.as_ref().map(|a| *a.address());
        let guardian = ctx.accounts.guardian.as_ref().map(|a| *a.address());
        let bump = ctx.bumps.plan;

        init_plan_fields(
            &mut ctx.accounts.plan,
            &owner,
            &destination,
            PLAN_MODE_BACKUP,
            checkin_interval_secs,
            grace_period_secs,
            pause_duration_secs,
            checkin_signer,
            guardian,
            bump,
        )
    }
}

/// Opens a custodial vault plan.
///
/// Assets deposited here leave the owner's wallet, which costs the ability to
/// trade them but removes the delegate-eviction failure mode that backup mode
/// lives with. Intended for long-horizon inheritance rather than active holdings.
#[derive(Accounts)]
pub struct InitializeVaultPlan {
    #[account(mut)]
    pub owner: Signer,

    /// CHECK: heir pubkey, stored on the plan.
    pub destination: UncheckedAccount,

    /// CHECK: optional hot wallet allowed to check in only.
    pub checkin_signer: Option<UncheckedAccount>,

    /// CHECK: optional guardian allowed to defer only.
    pub guardian: Option<UncheckedAccount>,

    #[account(
        init,
        payer = owner,
        space = StockPlan::LEN,
        seeds = [StockPlan::SEED, owner.address().as_ref(), &[PLAN_MODE_VAULT]],
        bump,
    )]
    pub plan: BorshAccount<StockPlan>,

    pub system_program: Program<System>,
}

impl InitializeVaultPlan {
    pub fn initialize_vault_plan_handler(
        ctx: &mut Context<InitializeVaultPlan>,
        checkin_interval_secs: i64,
        grace_period_secs: i64,
        pause_duration_secs: i64,
    ) -> Result<()> {
        let owner = *ctx.accounts.owner.address();
        let destination = *ctx.accounts.destination.address();
        let checkin_signer = ctx.accounts.checkin_signer.as_ref().map(|a| *a.address());
        let guardian = ctx.accounts.guardian.as_ref().map(|a| *a.address());
        let bump = ctx.bumps.plan;

        init_plan_fields(
            &mut ctx.accounts.plan,
            &owner,
            &destination,
            PLAN_MODE_VAULT,
            checkin_interval_secs,
            grace_period_secs,
            pause_duration_secs,
            checkin_signer,
            guardian,
            bump,
        )
    }
}
