use quasar_lang::prelude::*;
use quasar_spl::{Mint, Token, TokenCpi, TokenInterface};

use crate::{
    errors::HeirloomError,
    state::{Estate, Vault},
};

#[derive(Accounts)]
pub struct Revoke<'info> {
    #[account(
        mut,
        address = estate.authority,
    )]
    pub authority: Signer,

    // FIXME: conflicting wincode versions don't allow us to pass them as args
    pub heir: UncheckedAccount,

    #[account(mut, seeds = Estate::seeds(authority, heir), bump, close=authority)]
    pub estate: Account<Estate<'info>>,

    #[account(mut, seeds = Vault::seeds(authority, heir), bump, close=authority)]
    pub vault: Account<Vault>,

    #[account(mut)]
    pub authority_token_account: Option<InterfaceAccount<Token>>,

    #[account(mut)]
    pub vault_token_account: Option<InterfaceAccount<Token>>,

    #[account(mut)]
    pub mint: Option<Account<Mint>>,

    pub token_program: Interface<TokenInterface>,

    pub system_program: Program<System>,
}

impl Revoke<'_> {
    #[inline(always)]
    pub fn revoke_handler<'a>(ctx: &mut Ctx<'a, Revoke<'a>>) -> Result<(), ProgramError> {
        ctx.accounts.validate()?;

        // return funds to authority
        ctx.accounts.return_assets()?;

        // close estate and vault, rent lamports go back to authority
        let authority_view = ctx.accounts.authority.to_account_view();
        ctx.accounts.estate.close(authority_view)?;
        ctx.accounts.vault.close(authority_view)?;

        Ok(())
    }

    #[inline(always)]
    pub fn validate(&self) -> Result<(), ProgramError> {
        // cannot revoke an already claimed estate
        if self.estate.is_claimed.get() {
            return Err(HeirloomError::AlreadyClaimed.into());
        }

        // token accounts must all be present together
        if self.authority_token_account.is_some()
            && (self.vault_token_account.is_none() || self.mint.is_none())
        {
            return Err(HeirloomError::MissingTokenAccounts.into());
        }

        Ok(())
    }

    #[inline(always)]
    pub fn return_assets(&self) -> Result<(), ProgramError> {
        match self.authority_token_account.as_ref() {
            Some(authority_ta) => {
                let vault_token_account = self.vault_token_account.as_ref().unwrap();
                let mint = self.mint.as_ref().unwrap();
                let amount = vault_token_account.amount();

                self.token_program
                    .transfer_checked(
                        vault_token_account,
                        mint,
                        authority_ta,
                        &self.vault,
                        amount,
                        mint.decimals(),
                    )
                    .invoke()?;

                // close vault token account, rent back to authority
                self.token_program
                    .close_account(vault_token_account, &self.authority, &self.vault)
                    .invoke()?;
            }
            // SOL path: drain vault lamports back to authority
            None => {
                let vault_view = self.vault.to_account_view();
                let authority_view = self.authority.to_account_view();
                let amount = vault_view.lamports();

                set_lamports(vault_view, 0);
                set_lamports(authority_view, authority_view.lamports() + amount);
            }
        }

        Ok(())
    }
}
