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
        heartbeat_interval: Option<i64>,
        grace_period: Option<i64>,
        pause_duration: Option<i64>,
        label: Option<String>,
    ) -> Result<()> {
        ctx.accounts.validate()?;

        let now = Clock::get()?.unix_timestamp;
        let authority_key = ctx.accounts.authority.address();
        let estate = &mut ctx.accounts.estate;

        estate.last_heartbeat = now;

        // Clear deferred state when the authority returns and sends heartbeat
        if estate.paused_until > 0 && now >= estate.paused_until {
            estate.paused_until = 0;
        }

        if *authority_key == estate.authority {
            if let Some(hi) = heartbeat_interval {
                validate_interval(hi)?;
                estate.heartbeat_interval = hi;
            }
            if let Some(gp) = grace_period {
                validate_interval(gp)?;
                estate.grace_period = gp;
            }
            if let Some(pd) = pause_duration {
                validate_interval(pd)?;
                estate.pause_duration = pd;
            }
            if let Some(l) = label {
                require!(l.len() <= 32, HeirloomError::LabelTooLong);
                estate.label = l;
            }
        }

        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        let signer = *self.authority.address();
        if signer != self.estate.authority {
            match self.estate.hb_signer {
                Some(hb) if signer == hb => {}
                _ => return Err(HeirloomError::Unauthorized.into()),
            }
        }

        Ok(())
    }
}
