use quasar_lang::prelude::*;
use quasar_spl::{Mint, Token, TokenInterface};

use crate::{
    errors::HeirloomError,
    state::{Estate, Vault},
};

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut, address  = estate.authority)]
    pub authority: Signer,

    #[account(mut,address=estate.heir,)]
    pub heir: UncheckedAccount,

    #[account(mut, seeds = Estate::seeds(authority, heir), bump )]
    pub estate: Account<Estate<'info>>,

    #[account(mut, seeds = Vault::seeds(authority, heir), bump, close=heir)]
    pub vault: Account<Vault>,

    #[account(mut)]
    pub vault_token_account: Option<InterfaceAccount<Token>>,

    #[account(mut)]
    pub mint: Option<Account<Mint>>,

    pub token_program: Interface<TokenInterface>,

    pub clock: Sysvar<Clock>,

    pub system_program: Program<System>,
}

impl Update<'_> {
    #[inline(always)]
    pub fn update_fields_handler<'a>(
        ctx: &mut Ctx<'a, Update<'a>>,
        heartbeat_interval: Option<i64>,
        grace_period: Option<i64>,
        pause_duration: Option<i64>,
        // label: Option<&str>,
    ) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        // heartbeat is always updated
        let now = ctx.accounts.clock.unix_timestamp;
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
        //     // TODO: NOT TESTED
        //     ctx.accounts
        //         .estate
        //         .set_label(ctx.accounts.authority.to_account_view(), l);
        // }

        Ok(())
    }

    #[inline(always)]
    pub fn transfer_heir_handler<'a>(ctx: &mut Ctx<'a, Update<'a>>) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        // find the pda for estate and vault,

        // update estate with correct bumps

        // create the pda

        // transfer assets

        // close previous accounts,

        // self.system_program
        //     .create_account(from, to, lamports, space, owner);

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
