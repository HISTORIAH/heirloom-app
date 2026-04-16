use quasar_lang::prelude::*;

use crate::{errors::HeirloomError, state::Estate};

#[derive(Accounts)]
pub struct Defer {
    #[account(
      mut,
      address  = estate.delegate.unwrap(), // ! NOTE: UNTESTED
    )]
    pub delegate: Signer,

    pub authority: UncheckedAccount,

    pub heir: UncheckedAccount,

    #[account(mut, seeds = Estate::seeds(authority, heir), bump )]
    pub estate: Account<Estate>,

    pub clock: Sysvar<Clock>,

    pub system_program: Program<System>,
}

impl Defer {
    #[inline(always)]
    pub fn delegate_defer_handler(ctx: &mut Ctx<Defer>) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        let now = ctx.accounts.clock.unix_timestamp;
        ctx.accounts.estate.paused_until = now + ctx.accounts.estate.pause_duration;
        ctx.accounts.estate.is_deferred = PodBool::from(true);

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        // estate must not already be claimed
        require_eq!(
            self.estate.is_claimed.get(),
            false,
            HeirloomError::AlreadyClaimed
        );

        // one-time use — guardian cannot defer twice
        require_eq!(
            self.estate.is_deferred.get(),
            false,
            HeirloomError::AlreadyDeferred
        );

        // defer must happen before the heir can claim —
        // once the claim window is open the delegate is too late
        let now = self.clock.unix_timestamp;
        let claimable_at = self
            .estate
            .last_heartbeat
            .checked_add(self.estate.heartbeat_interval)
            .and_then(|t| t.checked_add(self.estate.grace_period))
            .ok_or(ProgramError::ArithmeticOverflow)?;

        if now >= claimable_at {
            return Err(HeirloomError::DeferWindowExpired.into());
        }

        Ok(())
    }
}
