use anchor_lang::prelude::*;

use crate::{error::HeirloomError, helpers::validate_interval, Estate};

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
        checkin_interval_secs: Option<i64>,
        grace_period_secs: Option<i64>,
        delegate_pause_duration_secs: Option<i64>,
    ) -> Result<()> {
        ctx.accounts.validate()?;

        let now = Clock::get()?.unix_timestamp;
        let authority_key = ctx.accounts.authority.address();
        let estate = &mut ctx.accounts.estate;

        estate.last_checkin_ts = now;

        // Clear expired delegate pause on checkin
        if estate.delegate_pause_expires_at > 0 && now >= estate.delegate_pause_expires_at {
            estate.delegate_pause_expires_at = 0;
        }

        if *authority_key == estate.authority {
            if let Some(ci) = checkin_interval_secs {
                validate_interval(ci)?;
                estate.checkin_interval_secs = ci;
            }
            if let Some(gp) = grace_period_secs {
                validate_interval(gp)?;
                estate.grace_period_secs = gp;
            }
            if let Some(dpd) = delegate_pause_duration_secs {
                validate_interval(dpd)?;
                estate.delegate_pause_duration_secs = dpd;
            }
        }

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        let signer = *self.authority.address();
        if signer != self.estate.authority {
            match self.estate.checkin_signer {
                Some(cs) if signer == cs => {}
                _ => return Err(HeirloomError::Unauthorized.into()),
            }
        }

        Ok(())
    }
}
