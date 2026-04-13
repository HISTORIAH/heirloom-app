use quasar_lang::prelude::*;

use crate::{errors::HeirloomError, state::Estate};

#[derive(Accounts)]
pub struct Heartbeat<'info> {
    #[account(
      mut,
      address  = estate.authority,
    )]
    pub authority: Signer,

    //  FIXME: conflicting wincode versions don't allow us to pass them as args
    pub heir: UncheckedAccount,

    #[account(mut, seeds = Estate::seeds(authority, heir), bump )]
    pub estate: Account<Estate<'info>>,

    pub clock: Sysvar<Clock>,

    pub system_program: Program<System>,
}

impl Heartbeat<'_> {
    #[inline(always)]
    pub fn heartbeat_handler<'a>(ctx: &mut Ctx<'a, Heartbeat<'a>>) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        // handler
        let current_ts = ctx.accounts.clock.unix_timestamp;
        ctx.accounts.estate.last_heartbeat = current_ts;

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        require_eq!(
            self.estate.is_claimed.get(),
            false,
            HeirloomError::AlreadyClaimed
        );

        Ok(())
    }
}
