use anchor_lang::prelude::*;

use crate::{error::HeirloomError, Estate};

#[derive(Accounts)]
pub struct UpdateField {
    #[account(mut)]
    pub authority: Signer,

    /// CHECK: heir verified via estate PDA derivation
    #[account(address = estate.heir)]
    pub heir: UncheckedAccount,

    #[account(
        mut,
        seeds = [Estate::SEED, estate.authority.as_ref(), heir.address().as_ref()],
        bump = estate.bump,
    )]
    pub estate: BorshAccount<Estate>,

    pub system_program: Program<System>,
}

impl UpdateField {
    pub fn update_fields_handler(
        ctx: &mut Context<UpdateField>,
        check_in_interval_secs: Option<i64>,
        grace_period_secs: Option<i64>,
        delegate_pause_duration_secs: Option<i64>,
        total_periods: Option<u16>,
        period_secs: Option<i64>,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        ctx.accounts.validate(now)?;

        let authority_key = ctx.accounts.authority.address();
        let estate = &mut ctx.accounts.estate;

        estate.last_check_in_ts = now;

        // Clear expired delegate pause on check_in
        if estate.delegate_pause_expires_at > 0 && now >= estate.delegate_pause_expires_at {
            estate.delegate_pause_expires_at = 0;
        }

        if *authority_key == estate.authority {
            if let Some(ci) = check_in_interval_secs {
                Estate::validate_interval_secs(ci)?;
                estate.check_in_interval_secs = ci;
            }
            if let Some(gp) = grace_period_secs {
                Estate::validate_interval_secs(gp)?;
                estate.grace_period_secs = gp;
            }
            if let Some(dpd) = delegate_pause_duration_secs {
                Estate::validate_interval_secs(dpd)?;
                estate.delegate_pause_duration_secs = dpd;
            }
            if total_periods.is_some() || period_secs.is_some() {
                let tp = total_periods.unwrap_or(estate.total_periods);
                let ps = period_secs.unwrap_or(estate.period_secs);
                Estate::validate_schedule(tp, ps)?;
                estate.total_periods = tp;
                estate.period_secs = ps;
            }
        }

        Ok(())
    }

    pub fn validate(&self, now: i64) -> Result<()> {
        // No check-ins once the estate is open, so the open time (and the
        // payout schedule counted from it) can't move under the heir.
        require!(now < self.estate.opens_at()?, HeirloomError::EstateOpened);

        let signer = *self.authority.address();
        if signer != self.estate.authority {
            match self.estate.check_in_signer {
                Some(cs) if signer == cs => {}
                _ => return Err(HeirloomError::Unauthorized.into()),
            }
        }

        Ok(())
    }
}
