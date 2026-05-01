use quasar_lang::prelude::*;

use crate::{errors::HeirloomError, state::Estate};

#[derive(Accounts)]
pub struct UpdateFields {
    #[account(mut, address = estate.authority)]
    pub authority: Signer,

    #[account(address = estate.heir)]
    pub heir: UncheckedAccount,

    #[account(mut, address = Estate::seeds(authority.address(), heir.address()))]
    pub estate: Account<Estate>,

    pub clock: Sysvar<Clock>,
}

impl UpdateFields {
    #[inline(always)]
    pub fn update_fields_handler<'a>(
        ctx: &mut Ctx<UpdateFields>,
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
        //     ctx.accounts
        //         .estate
        //         .set_label(ctx.accounts.authority.to_account_view(), l);
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

        /* The pause should
           only gate the claim instruction, not heartbeats.
        */
        //
        // let now = self.clock.unix_timestamp;
        //
        // if now < self.estate.paused_until {
        //     return Err(HeirloomError::EstatePaused.into());
        // }

        Ok(())
    }
}
