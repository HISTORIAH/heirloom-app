use quasar_lang::prelude::*;
use quasar_spl::{Mint, Token, TokenCpi, TokenInterface};

use crate::{
    errors::HeirloomError,
    state::{Estate, Vault},
};

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut,address=estate.heir,)]
    pub heir: Signer,

    #[account(address=estate.authority)]
    pub authority: UncheckedAccount,

    #[account(mut)]
    pub delegate: Option<UncheckedAccount>,

    #[account(mut)]
    pub heir_token_account: Option<InterfaceAccount<Token>>,

    #[account(mut, seeds = Estate::seeds(authority, heir), bump)]
    pub estate: Account<Estate<'info>>,

    #[account(mut, seeds = Vault::seeds(authority, heir), bump, close=heir)]
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

impl Claim<'_> {
    #[inline(always)]
    pub fn claim_handler<'a>(ctx: &mut Ctx<'a, Claim<'a>>) -> Result<(), ProgramError> {
        //validate
        ctx.accounts.validate()?;

        // transfer assets
        ctx.accounts.transfer_assets()?;

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        // already claimed
        if self.estate.is_claimed.get() {
            return Err(HeirloomError::AlreadyClaimed.into());
        }

        // check delegate addresses
        if let (Some(delegate_stored), Some(delegate_acc)) =
            (self.estate.delegate, self.delegate.as_ref())
        {
            require_eq!(
                &delegate_stored,
                delegate_acc.address(),
                HeirloomError::MismatchedAddress
            )
        }

        // timeline: claimable only after last_heartbeat + interval + grace_period,
        // and also after any delegate-issued pause has expired
        let now = self.clock.unix_timestamp;
        let claimable_at = self
            .estate
            .last_heartbeat
            .checked_add(self.estate.heartbeat_interval)
            .and_then(|t| t.checked_add(self.estate.grace_period))
            .ok_or(ProgramError::ArithmeticOverflow)?;

        let effective_claimable_at = claimable_at.max(self.estate.paused_until);

        if now < effective_claimable_at {
            return Err(HeirloomError::NotYetClaimable.into());
        }

        // token path: all three must be present together
        match self.heir_token_account.as_ref() {
            Some(_) => {
                if self.vault_token_account.is_none() || self.mint.is_none() {
                    return Err(HeirloomError::MissingTokenAccounts.into());
                }

                // mint must match what was recorded on the estate
                let mint = self.mint.as_ref().unwrap();
                let estate_mint = self.estate.mint.ok_or(HeirloomError::MintMismatch)?;
                if *mint.to_account_view().address() != estate_mint {
                    return Err(HeirloomError::MintMismatch.into());
                }
            }

            // SOL path: vault must have a balance
            None => {
                if self.vault.to_account_view().lamports() == 0 {
                    return Err(HeirloomError::InsufficientVaultBalance.into());
                }
            }
        }

        Ok(())
    }

    #[inline(always)]
    pub fn transfer_assets(&self) -> Result<(), ProgramError> {
        // token transfer block
        match self.heir_token_account.as_ref() {
            Some(heir_ta) => {
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
                        vault_token_account,
                        mint,
                        heir_ta,
                        &self.authority,
                        vault_token_account.amount(),
                        mint.decimals(),
                    )
                    .invoke()?;
            }
            // sol transfer block
            None => {
                let heir = self.heir.to_account_view();
                let vault = self.vault.to_account_view();
                let amount = vault.lamports();

                set_lamports(vault, vault.lamports() - amount);
                set_lamports(heir, heir.lamports() + amount);
            }
        }

        Ok(())
    }
}
