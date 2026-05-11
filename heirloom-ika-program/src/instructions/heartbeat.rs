use quasar_lang::prelude::*;

use crate::{errors::HeirloomIkaError, state::Estate};

#[derive(Accounts)]
pub struct Heartbeat {
    /// Relayer pays gas — has no authority over the estate
    #[allow(unused)]
    #[account(mut)]
    pub relayer: Signer,

    // #[account(mut, address = Estate::seeds(&estate.estate_id))]
    #[account(mut)]
    pub estate: Account<Estate>,

    pub clock: Sysvar<Clock>,
}

impl Heartbeat {
    #[inline(always)]
    pub fn heartbeat_handler(ctx: &mut Ctx<Heartbeat>) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        let now = ctx.accounts.clock.unix_timestamp.get();
        ctx.accounts.estate.last_heartbeat = now.into();

        // Reset defer status on heartbeat
        ctx.accounts.estate.is_deferred = false.into();
        ctx.accounts.estate.paused_until = 0.into();

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        require!(
            !self.estate.is_claimed.get(),
            HeirloomIkaError::EstateAlreadyClaimed
        );

        let now = self.clock.unix_timestamp.get();

        // Prevent heartbeat spam — must wait at least 1 minute
        let last = self.estate.last_heartbeat.get();
        if now < last + 60 {
            return Err(HeirloomIkaError::HeartbeatTooSoon.into());
        }

        // If paused, heartbeat is not allowed until pause expires
        if now < self.estate.paused_until.get() {
            return Err(HeirloomIkaError::EstatePaused.into());
        }

        Ok(())
    }
}
