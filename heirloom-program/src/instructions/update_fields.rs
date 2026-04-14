use quasar_lang::prelude::*;

use crate::{errors::HeirloomError, state::Estate};

#[derive(Accounts)]
pub struct UpdateFields<'info> {
    #[account(mut, address = estate.authority)]
    pub authority: Signer,

    // FIXME: conflicting wincode versions don't allow us to pass them as args
    #[account(address = estate.heir)]
    pub heir: UncheckedAccount,

    #[account(mut, seeds = Estate::seeds(authority, heir), bump = estate.bump)]
    pub estate: Account<Estate<'info>>,

    pub clock: Sysvar<Clock>,
}

impl UpdateFields<'_> {
    #[inline(always)]
    pub fn handler<'a>(
        ctx: &mut Ctx<'a, UpdateFields<'a>>,
        heartbeat_interval: Option<i64>,
        grace_period: Option<i64>,
        pause_duration: Option<i64>,
        // label: Option<&str>,
    ) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        let now = ctx.accounts.clock.unix_timestamp;

        // heartbeat is always updated
        ctx.accounts.estate.last_heartbeat = now;

        if let Some(hi) = heartbeat_interval {
            ctx.accounts.estate.heartbeat_interval = PodI64::from(hi);
        }
        if let Some(gp) = grace_period {
            ctx.accounts.estate.grace_period = PodI64::from(gp);
        }
        if let Some(pd) = pause_duration {
            ctx.accounts.estate.pause_duration = PodI64::from(pd);
        }
        // if let Some(l) = label {
        //     ctx.accounts.estate.set_label(ctx.accounts.authority.to_account_view(), l);
        // }

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        require_eq!(
            self.estate.is_claimed.get(),
            false,
            HeirloomError::AlreadyClaimed
        );

        let now = self.clock.unix_timestamp;
        if now < self.estate.paused_until {
            return Err(HeirloomError::EstatePaused.into());
        }

        Ok(())
    }
}
