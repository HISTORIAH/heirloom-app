use anchor_lang::prelude::*;

use crate::{error::StocksError, StockPlan};

/// Proof of life. Resets the countdown and clears any guardian defer.
///
/// This carries no configuration arguments, unlike the equivalent instruction in
/// the inheritance program. A check-in is the one action a delegated hot wallet is
/// trusted with, so keeping settings changes out of it means `checkin_signer` can
/// never be a path to editing the plan.
#[derive(Accounts)]
pub struct CheckIn {
    #[account(mut)]
    pub signer: Signer,

    #[account(
        mut,
        seeds = [StockPlan::SEED, plan.owner.as_ref(), &[plan.mode]],
        bump = plan.bump,
    )]
    pub plan: BorshAccount<StockPlan>,

    pub system_program: Program<System>,
}

impl CheckIn {
    pub fn check_in_handler(ctx: &mut Context<CheckIn>) -> Result<()> {
        ctx.accounts.validate()?;

        let now = Clock::get()?.unix_timestamp;
        let plan = &mut ctx.accounts.plan;

        plan.last_checkin_ts = now;

        // The owner is demonstrably back, so a guardian's extension has served its
        // purpose and should not keep the deadline pushed out.
        plan.paused_until = 0;

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        let signer = *self.signer.address();

        if signer != self.plan.owner {
            match self.plan.checkin_signer {
                Some(hot) if signer == hot => {}
                _ => return Err(StocksError::Unauthorized.into()),
            }
        }

        Ok(())
    }
}
