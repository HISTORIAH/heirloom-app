use quasar_lang::prelude::*;
use quasar_spl::{Mint, Token, TokenCpi, TokenInterface};

use crate::state::{Estate, EstateInner, Vault, VaultInner};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer,

    //  FIXME: conflicting wincode versions don't allow us to pass them as args
    pub heir: UncheckedAccount,

    //  FIXME: conflicting wincode versions don't allow us to pass them as args
    pub delegate: Option<UncheckedAccount>,

    #[account(mut)]
    pub authority_token_account: Option<InterfaceAccount<Token>>,

    #[account(mut, init, payer = authority, seeds = Estate::seeds(authority, heir), bump )]
    pub estate: Account<Estate<'info>>,

    #[account(mut, init, payer = authority, seeds = Vault::seeds(authority, heir), bump )]
    pub vault: Account<Vault>,

    #[account(mut)]
    pub vault_token_account: Option<InterfaceAccount<Token>>,

    #[account(mut)]
    pub mint: Option<Account<Mint>>,

    pub token_program: Interface<TokenInterface>,

    pub rent: Sysvar<Rent>,

    pub clock: Sysvar<Clock>,

    pub system_program: Program<System>,
}

impl Initialize<'_> {
    #[inline(always)]
    pub fn initialize_handler<'a>(
        ctx: &mut Ctx<'a, Initialize<'a>>,
        heartbeat_interval: i64,
        grace_period: i64,
        pause_duration: i64,
        label: &str,
        amount: u64, // in token amount
    ) -> Result<(), ProgramError> {
        // validate everything
        ctx.accounts.validate()?;

        let estate_bump = ctx.bumps.estate;
        let vault_bump = ctx.bumps.vault;

        // set account fields
        ctx.accounts.set_acc_fields(
            label,
            heartbeat_interval,
            grace_period,
            pause_duration,
            estate_bump,
            vault_bump,
        )?;

        // transfer assets
        ctx.accounts.transfer_assets(amount)?;

        log("creating vault"); // ! DEBUG STATEMENT

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        // ? check account balance here

        // ? if token account specified

        // if let Some(authority_ata) = self.authority_token_account {
        //     // check balances
        // }
        //
        //
        // ? check the mint match the auathority ata

        // ? check if mint initialized

        // ? if one token type is passed check if the rest are passed as well

        Ok(())
    }

    #[inline(always)]
    pub fn set_acc_fields(
        &mut self,
        label: &str,
        heartbeat_interval: i64,
        grace_period: i64,
        pause_duration: i64,
        estate_bump: u8,
        vault_bump: u8,
    ) -> Result<(), ProgramError> {
        // FIXME: remove the clock and get the time in the program

        self.estate.set_inner(
            EstateInner {
                authority: *self.authority.address(),
                heir: *self.heir.address(),
                heartbeat_interval,
                grace_period,
                last_heartbeat: 0,
                created_at: self.clock.unix_timestamp.get(),
                bump: estate_bump,
                is_claimed: false,
                delegate: self.delegate.as_ref().map(|a| *a.address()),
                mint: self.mint.as_ref().map(|m| *m.address()),
                label,
                pause_duration,
                paused_until: 0,
                is_deferred: false,
            },
            self.authority.to_account_view(),
            Some(&self.rent),
        )?;

        self.vault.set_inner(VaultInner {
            estate: *self.estate.address(),
            bump: vault_bump,
        });

        Ok(())
    }

    #[inline(always)]
    pub fn transfer_assets(&self, amount: u64) -> Result<(), ProgramError> {
        // token transfer block
        match self.authority_token_account.as_ref() {
            Some(authority_ta) => {
                // init vault if not exists
                // safe to unwrap since it is checked in validate
                let vault_token_account = self.vault_token_account.as_ref().unwrap();
                let mint = self.mint.as_ref().unwrap();

                if !vault_token_account.is_initialized() {
                    self.token_program
                        .initialize_account3(vault_token_account, mint, self.vault.address())
                        .invoke()?;
                }

                self.token_program
                    .transfer_checked(
                        authority_ta,
                        mint,
                        vault_token_account,
                        &self.authority,
                        amount,
                        mint.decimals(),
                    )
                    .invoke()?;
            }
            // sol transfer block
            None => {
                self.system_program
                    .transfer(&self.authority, &self.vault, amount)
                    .invoke()?;
            }
        }

        Ok(())
    }
}
