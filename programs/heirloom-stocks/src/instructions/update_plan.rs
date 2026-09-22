use anchor_lang::prelude::*;

use crate::{error::StocksError, helpers::validate_interval, StockPlan};

/// Owner-only configuration changes.
///
/// Passing `None` leaves a field alone. Note this does not check in — timing and
/// settings are separate instructions on purpose, so lengthening an interval is
/// never mistaken for proof of life.
#[derive(Accounts)]
pub struct UpdatePlan {
    #[account(mut, address = plan.owner @ StocksError::Unauthorized)]
    pub owner: Signer,

    /// CHECK: new destination pubkey, when one is supplied.
    pub new_destination: Option<UncheckedAccount>,

    /// CHECK: new hot check-in wallet, when one is supplied.
    pub new_checkin_signer: Option<UncheckedAccount>,

    /// CHECK: new guardian, when one is supplied.
    pub new_guardian: Option<UncheckedAccount>,

    #[account(
        mut,
        seeds = [StockPlan::SEED, plan.owner.as_ref(), &[plan.mode]],
        bump = plan.bump,
    )]
    pub plan: BorshAccount<StockPlan>,

    pub system_program: Program<System>,
}

impl UpdatePlan {
    pub fn update_plan_handler(
        ctx: &mut Context<UpdatePlan>,
        checkin_interval_secs: Option<i64>,
        grace_period_secs: Option<i64>,
        pause_duration_secs: Option<i64>,
        clear_checkin_signer: bool,
        clear_guardian: bool,
    ) -> Result<()> {
        let owner = *ctx.accounts.owner.address();
        let new_destination = ctx.accounts.new_destination.as_ref().map(|a| *a.address());
        let new_checkin_signer = ctx
            .accounts
            .new_checkin_signer
            .as_ref()
            .map(|a| *a.address());
        let new_guardian = ctx.accounts.new_guardian.as_ref().map(|a| *a.address());

        let plan = &mut ctx.accounts.plan;

        if let Some(interval) = checkin_interval_secs {
            validate_interval(interval)?;
            plan.checkin_interval_secs = interval;
        }
        if let Some(grace) = grace_period_secs {
            validate_interval(grace)?;
            plan.grace_period_secs = grace;
        }
        if let Some(pause) = pause_duration_secs {
            validate_interval(pause)?;
            plan.pause_duration_secs = pause;
        }

        if let Some(destination) = new_destination {
            require_keys_neq!(destination, owner, StocksError::DestinationIsOwner);
            plan.destination = destination;
        }

        if clear_checkin_signer {
            plan.checkin_signer = None;
        } else if let Some(signer) = new_checkin_signer {
            plan.checkin_signer = Some(signer);
        }

        if clear_guardian {
            plan.guardian = None;
        } else if let Some(guardian) = new_guardian {
            plan.guardian = Some(guardian);
        }

        Ok(())
    }
}
