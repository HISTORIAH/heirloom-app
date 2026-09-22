use anchor_lang::prelude::*;

use crate::{error::StocksError, StockPlan};

/// Closes an empty plan and returns its rent to the owner.
///
/// Every asset must be uncovered or withdrawn first. Closing while assets were
/// still covered would leave backup-mode token accounts with a delegate whose
/// authorising account no longer exists, so the allowance could never be revoked.
#[derive(Accounts)]
pub struct ClosePlan {
    #[account(mut, address = plan.owner @ StocksError::Unauthorized)]
    pub owner: Signer,

    #[account(
        mut,
        seeds = [StockPlan::SEED, plan.owner.as_ref(), &[plan.mode]],
        bump = plan.bump,
    )]
    pub plan: BorshAccount<StockPlan>,

    pub system_program: Program<System>,
}

impl ClosePlan {
    pub fn close_plan_handler(ctx: &mut Context<ClosePlan>) -> Result<()> {
        require!(
            ctx.accounts.plan.covered_assets == 0,
            StocksError::PlanNotEmpty
        );

        let owner_view = ctx.accounts.owner.account().clone();
        ctx.accounts.plan.close(owner_view)?;

        Ok(())
    }
}
