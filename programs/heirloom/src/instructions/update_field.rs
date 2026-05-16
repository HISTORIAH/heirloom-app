use anchor_lang::prelude::*;

use crate::{error::HeirloomError, Estate};

#[derive(Accounts)]
pub struct UpdateField<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: heir verified via estate PDA derivation
    #[account(address = estate.heir)]
    pub heir: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [Estate::SEED, estate.authority.as_ref(), heir.key().as_ref()],
        bump = estate.bump,
    )]
    pub estate: Account<'info, Estate>,

    pub system_program: Program<'info, System>,
}

impl<'info> UpdateField<'info> {
    pub fn update_fields_handler(
        ctx: Context<UpdateField>,
        heartbeat_interval: Option<i64>,
        grace_period: Option<i64>,
        pause_duration: Option<i64>,
        label: Option<String>,
    ) -> Result<()> {
        ctx.accounts.validate()?;

        let now = Clock::get()?.unix_timestamp;
        let authority_key = ctx.accounts.authority.key();
        let estate = &mut ctx.accounts.estate;

        estate.last_heartbeat = now;

        if authority_key == estate.authority {
            if let Some(hi) = heartbeat_interval {
                estate.heartbeat_interval = hi;
            }
            if let Some(gp) = grace_period {
                estate.grace_period = gp;
            }
            if let Some(pd) = pause_duration {
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
        require!(!self.estate.is_claimed, HeirloomError::AlreadyClaimed);

        let signer = self.authority.key();
        if signer != self.estate.authority {
            match self.estate.hb_signer {
                Some(hb) if signer == hb => {}
                _ => return err!(HeirloomError::Unauthorized),
            }
        }

        Ok(())
    }
}
