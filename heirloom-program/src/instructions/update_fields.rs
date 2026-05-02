use quasar_lang::prelude::*;

use crate::{errors::HeirloomError, state::Estate};

#[derive(Accounts)]
pub struct UpdateFields {
    #[account(mut)]
    pub authority: Signer,

    #[account(address = estate.heir)]
    pub heir: UncheckedAccount,

    #[account(mut)]
    pub estate: Account<Estate>,

    pub clock: Sysvar<Clock>,

    pub system_program: Program<SystemProgram>,
}

impl UpdateFields {
    #[inline(always)]
    pub fn update_fields_handler(
        ctx: &mut Ctx<UpdateFields>,
        heartbeat_interval: Option<i64>,
        grace_period: Option<i64>,
        pause_duration: Option<i64>,
        label: Option<String<32>>,
    ) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        let estate = &mut ctx.accounts.estate;
        let now = ctx.accounts.clock.unix_timestamp;

        // heartbeat is always updated
        estate.last_heartbeat = now;

        // only main authority can update config values
        if *ctx.accounts.authority.address() == estate.authority {
            if let Some(hi) = heartbeat_interval {
                estate.heartbeat_interval = hi.into();
            }
            if let Some(gp) = grace_period {
                estate.grace_period = gp.into();
            }
            if let Some(pd) = pause_duration {
                estate.pause_duration = pd.into();
            }
        }

        // label is also restricted to main authority
        // as_mut() borrows estate mutably, so we call it after the &mut estate borrow above is dropped
        if *ctx.accounts.authority.address() == ctx.accounts.estate.authority {
            if let Some(l) = label {
                let mut guard = ctx
                    .accounts
                    .estate
                    .as_mut(&ctx.accounts.authority.to_account_view());
                if !guard.label.set(l.as_str()) {
                    return Err(HeirloomError::LabelTooLong.into());
                }
            }
        }

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        require_eq!(
            self.estate.is_claimed.get(),
            false,
            HeirloomError::AlreadyClaimed
        );

        // Verify the estate PDA was derived from (estate.authority, heir).
        let seeds = Estate::seeds(&self.estate.authority, self.heir.address());
        seeds.verify(self.estate.to_account_view().address(), &crate::ID)?;

        // signer must be the authority, or the designated hb_signer
        let signer = *self.authority.address();
        if signer != self.estate.authority {
            if let Some(hb_signer) = self.estate.hb_signer.get() {
                if signer != hb_signer {
                    return Err(HeirloomError::Unauthorized.into());
                }
            } else {
                return Err(HeirloomError::Unauthorized.into());
            }
        }

        Ok(())
    }
}
