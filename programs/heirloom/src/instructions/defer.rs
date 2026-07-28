use anchor_lang::prelude::*;

use crate::{error::HeirloomError, Estate};

#[derive(Accounts)]
pub struct DelegateDefer<'info> {
    #[account(
        mut,
        address = estate.delegate.ok_or(HeirloomError::Unauthorized)? @ HeirloomError::Unauthorized
    )]
    pub delegate: Signer<'info>,

    /// CHECK: authority verified via estate
    pub authority: UncheckedAccount<'info>,

    /// CHECK: heir verified via estate
    pub heir: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [Estate::SEED, authority.key().as_ref(), heir.key().as_ref()],
        bump = estate.bump,
    )]
    pub estate: Account<'info, Estate>,

    pub system_program: Program<'info, System>,
}

impl<'info> DelegateDefer<'info> {
    pub fn delegate_defer_handler(ctx: Context<DelegateDefer>) -> Result<()> {
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
