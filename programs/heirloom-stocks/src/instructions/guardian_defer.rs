use anchor_lang::prelude::*;

use crate::{error::StocksError, StockPlan};

/// Lets a guardian push the deadline out once.
///
/// This exists for the case where the owner is known to be alive but unable to
/// check in. A guardian can only ever delay a payout, never trigger or redirect
/// one, and only while the window is still open — after that the destination's
/// claim takes precedence and cannot be blocked.
#[derive(Accounts)]
pub struct GuardianDefer {
    #[account(
        mut,
        address = plan.guardian.ok_or(StocksError::Unauthorized)? @ StocksError::Unauthorized
    )]
    pub guardian: Signer,

    #[account(
        mut,
        seeds = [StockPlan::SEED, plan.owner.as_ref(), &[plan.mode]],
        bump = plan.bump,
    )]
    pub plan: BorshAccount<StockPlan>,

    pub system_program: Program<System>,
}

impl GuardianDefer {
    pub fn guardian_defer_handler(ctx: &mut Context<GuardianDefer>) -> Result<()> {
        ctx.accounts.validate()?;

        let now = Clock::get()?.unix_timestamp;
        ctx.accounts.plan.paused_until = now
            .checked_add(ctx.accounts.plan.pause_duration_secs)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        require!(self.plan.paused_until == 0, StocksError::AlreadyDeferred);

        let now = Clock::get()?.unix_timestamp;
        require!(
            now < self.plan.recoverable_at()?,
            StocksError::DeferWindowExpired
        );

        Ok(())
    }
}
