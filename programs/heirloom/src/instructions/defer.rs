use anchor_lang::prelude::*;

use crate::{error::HeirloomError, Estate};

#[derive(Accounts)]
pub struct DelegateDefer {
    #[account(
        mut,
        address = estate.delegate.ok_or(HeirloomError::Unauthorized)? @ HeirloomError::Unauthorized
    )]
    pub delegate: Signer,

    /// CHECK: authority verified via estate
    pub authority: UncheckedAccount,

    /// CHECK: heir verified via estate
    pub heir: UncheckedAccount,

    #[account(
        mut,
        seeds = [Estate::SEED, authority.address().as_ref(), heir.address().as_ref()],
        bump = estate.bump,
    )]
    pub estate: BorshAccount<Estate>,

    pub system_program: Program<System>,
}

impl DelegateDefer {
    pub fn delegate_defer_handler(ctx: &mut Context<DelegateDefer>) -> Result<()> {
        ctx.accounts.validate()?;

        let now = Clock::get()?.unix_timestamp;
        ctx.accounts.estate.paused_until = now
            .checked_add(ctx.accounts.estate.pause_duration)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        require!(
            self.estate.paused_until == 0,
            HeirloomError::AlreadyDeferred
        );

        let now = Clock::get()?.unix_timestamp;
        let claimable_at = self
            .estate
            .last_heartbeat
            .checked_add(self.estate.heartbeat_interval)
            .and_then(|t| t.checked_add(self.estate.grace_period))
            .ok_or(ProgramError::ArithmeticOverflow)?;

        require!(now < claimable_at, HeirloomError::DeferWindowExpired);

        Ok(())
    }
}
