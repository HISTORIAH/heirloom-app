use quasar_lang::prelude::*;
use quasar_spl::{Mint, Token, TokenCpi, TokenInterface};

use crate::{
    errors::HeirloomError,
    state::{Estate, EstateInner, Vault, VaultInner},
};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer,

    pub heir: UncheckedAccount,

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
        amount: u64, // in token amount
        label: &str,
    ) -> Result<(), ProgramError> {
        // validate everything
        ctx.accounts.validate_inputs(amount)?;

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

        // init vault token account if needed
        ctx.accounts.init_vault_token_account()?;

        // transfer assets
        ctx.accounts.transfer_assets(amount)?;

        Ok(())
    }

    #[inline(always)]
    pub fn validate_inputs(&self, amount: u64) -> Result<(), ProgramError> {
        match self.authority_token_account.as_ref() {
            Some(authority_ta) => {
                // all three token accounts must be present together
                let _vault_ta = self
                    .vault_token_account
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;
                let mint = self
                    .mint
                    .as_ref()
                    .ok_or(HeirloomError::MissingTokenAccounts)?;

                // mint must be initialized
                if !mint.is_initialized() {
                    return Err(HeirloomError::MintMismatch.into());
                }

                // authority ATA must belong to the correct mint
                if authority_ta.mint() != mint.to_account_view().address() {
                    return Err(HeirloomError::MintMismatch.into());
                }

                // authority must have sufficient token balance
                if authority_ta.amount() < amount {
                    return Err(HeirloomError::InsufficientVaultBalance.into());
                }
            }
            None => {
                // token accounts passed without authority ATA is invalid
                if self.vault_token_account.is_some() || self.mint.is_some() {
                    return Err(HeirloomError::MissingTokenAccounts.into());
                }

                // authority must have sufficient SOL (amount is in lamports on SOL path)
                if self.authority.to_account_view().lamports() < amount {
                    return Err(HeirloomError::InsufficientVaultBalance.into());
                }
            }
        }

        Ok(())
    }

    #[inline(always)]
    pub fn init_vault_token_account(&self) -> Result<(), ProgramError> {
        let vault_ta = match self.vault_token_account.as_ref() {
            Some(ta) => ta,
            None => return Ok(()),
        };
        let mint = self.mint.as_ref().unwrap();

        // uninitialized
        if vault_ta.to_account_view().is_data_empty() {
            self.token_program
                .initialize_account3(vault_ta, mint, self.vault.address())
                .invoke()?;
        }

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
                last_heartbeat: self.clock.unix_timestamp.get(),
                created_at: self.clock.unix_timestamp.get(),
                bump: estate_bump,
                is_claimed: false,
                delegate: self.delegate.as_ref().map(|a| *a.address()),
                claimable_assets: 0,
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
